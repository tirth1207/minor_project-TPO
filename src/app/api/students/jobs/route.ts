export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId, orgId } = auth

    // Fetch the student's profile details needed for eligibility checks
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("cgpa, active_backlogs, branch, profile_status, is_placed")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Fetch all approved job postings with company and eligible branches
    const { data: jobs, error: jobsError } = await supabase
      .from("job_postings")
      .select(`
        id,
        title,
        description,
        ctc_min,
        ctc_max,
        location,
        work_mode,
        min_cgpa,
        max_backlogs,
        require_mock,
        mock_pass_score,
        global_status,
        company_profiles (
          id,
          company_name,
          website
        ),
        job_eligible_branches (
          branch_name
        )
      `)
      .eq("global_status", "APPROVED")

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 400 })
    }

    // Fetch all approved mappings for the student's college
    const { data: mappings, error: mappingsError } = await supabase
      .from("job_college_mappings")
      .select("id, job_id, local_status")
      .eq("org_id", orgId)
      .eq("local_status", "APPROVED")

    if (mappingsError) {
      return NextResponse.json({ error: mappingsError.message }, { status: 400 })
    }

    // Create a map from job_id to mapping for quick lookup
    const mappingMap = new Map<string, { id: string; local_status: string }>()
    mappings?.forEach((m: any) => {
      mappingMap.set(m.job_id, { id: m.id, local_status: m.local_status })
    })

    // Determine if student can apply based on profile status and placement
    const studentCanApply =
      student.profile_status === "APPROVED" && !student.is_placed

    // Prepare job entries with mapping info
    const jobEntries = jobs.map((job: any) => {
      const {
        job_eligible_branches,
        company_profiles,
        ...jobRest
      } = job as any

      const mapping = mappingMap.get(jobRest.id) ?? null

      const eligibleBranches = (job_eligible_branches || []).map((b: any) => (b.branch_name || "").toLowerCase())
      const isEligibleBranch = eligibleBranches.length === 0 || eligibleBranches.includes((student.branch || "").toLowerCase())
      const isEligibleCgpa = student.cgpa >= jobRest.min_cgpa
      const isEligibleBacklogs = student.active_backlogs <= jobRest.max_backlogs
      const isEligible = isEligibleBranch && isEligibleCgpa && isEligibleBacklogs

      return {
        job: {
          id: jobRest.id,
          title: jobRest.title,
          description: jobRest.description,
          ctc_min: jobRest.ctc_min,
          ctc_max: jobRest.ctc_max,
          location: jobRest.location,
          work_mode: jobRest.work_mode,
          min_cgpa: jobRest.min_cgpa,
          max_backlogs: jobRest.max_backlogs,
          require_mock: jobRest.require_mock,
          mock_pass_score: jobRest.mock_pass_score,
          global_status: jobRest.global_status,
          company: company_profiles
            ? {
                id: company_profiles.id,
                company_name: company_profiles.company_name,
                website: company_profiles.website,
              }
            : null,
          branches: job_eligible_branches.map((b: { branch_name: string }) => ({
            branch_name: b.branch_name,
          })),
        },
        mapping: mapping
          ? {
              id: mapping.id,
              local_status: mapping.local_status,
            }
          : null,
        is_eligible: isEligible,
        eligibility_reasons: {
          branch: isEligibleBranch,
          cgpa: isEligibleCgpa,
          backlogs: isEligibleBacklogs,
        },
      }
    })

    // Fetch applicant counts for all mappings in parallel
    const mappingIds = jobEntries
      .filter((entry: any) => entry.mapping !== null)
      .map((entry: any) => entry.mapping!.id)

    let applicantCounts: Record<string, number> = {}
    if (mappingIds.length > 0) {
      const countsPromises = mappingIds.map((id: any) =>
        supabase.rpc("get_job_applicant_count", { p_job_college_map_id: id })
      )
      const results = await Promise.allSettled(countsPromises)
      results.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value.data !== null) {
          applicantCounts[mappingIds[idx]] = result.value.data
        } else {
          applicantCounts[mappingIds[idx]] = 0
        }
      })
    }

    // Attach applicant count to each job entry
    const finalJobs = jobEntries.map((entry: any) => ({
      ...entry,
      applicant_count: entry.mapping
        ? applicantCounts[entry.mapping.id] ?? 0
        : 0,
    }))

    return NextResponse.json({ jobs: finalJobs })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}