export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { getStudentEligibility } from "@/lib/eligibility/check-student-eligibility"

type JobBranch = { branch_name: string }
type CompanyProfile = { id: string; company_name: string; website: string | null } | null
type Job = {
  id: string
  title: string
  description: string
  skills: string[] | null
  ctc_min: number | null
  ctc_max: number | null
  location: string
  work_mode: string
  min_cgpa: number
  max_backlogs: number
  require_mock: boolean
  mock_pass_score: number
  global_status: string
  company_profiles: CompanyProfile
  job_eligible_branches: JobBranch[]
}
type Mapping = { id: string; job_id: string; local_status: string }

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId, orgId } = auth

    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const { data: jobs, error: jobsError } = await supabase
      .from("job_postings")
      .select(`
        id, title, description, skills, ctc_min, ctc_max, location, work_mode,
        min_cgpa, max_backlogs, require_mock, mock_pass_score, global_status,
        company_profiles (id, company_name, website),
        job_eligible_branches (branch_name)
      `)
      .eq("global_status", "APPROVED")

    if (jobsError) {
      console.error("Student jobs query failed:", jobsError)
      return NextResponse.json({ error: "Unable to load jobs" }, { status: 500 })
    }

    const { data: mappings, error: mappingsError } = await supabase
      .from("job_college_mappings")
      .select("id, job_id, local_status")
      .eq("org_id", orgId)
      .eq("local_status", "APPROVED")

    if (mappingsError) {
      console.error("Student job mappings query failed:", mappingsError)
      return NextResponse.json({ error: "Unable to load job availability" }, { status: 500 })
    }

    const mappingMap = new Map<string, { id: string; local_status: string }>()
    ;(mappings as Mapping[] | null)?.forEach((m) => {
      mappingMap.set(m.job_id, { id: m.id, local_status: m.local_status })
    })

    const jobEntries = await Promise.all(
      (jobs as Job[] | null ?? []).map(async (job) => {
        const mapping = mappingMap.get(job.id) ?? null
        let eligibilityDetails = null

        try {
          eligibilityDetails = await getStudentEligibility(
            supabase,
            studentId,
            job.id,
            orgId
          )
        } catch (err) {
          console.error(`Eligibility calculation failed for job ${job.id}:`, err)
        }

        return {
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            skills: job.skills || [],
            ctc_min: job.ctc_min,
            ctc_max: job.ctc_max,
            location: job.location,
            work_mode: job.work_mode,
            min_cgpa: job.min_cgpa,
            max_backlogs: job.max_backlogs,
            require_mock: job.require_mock,
            mock_pass_score: job.mock_pass_score,
            global_status: job.global_status,
            company: job.company_profiles,
            branches: job.job_eligible_branches || [],
          },
          mapping,
          is_eligible: eligibilityDetails?.eligible ?? false,
          eligibility_reasons: eligibilityDetails?.reasons ?? {
            profileApproved: false,
            notPlaced: false,
            collegeMapping: false,
            jobApproved: false,
            branch: false,
            cgpa: false,
            backlogs: false,
            skills: false,
          },
          matched_skills: eligibilityDetails?.matchedSkills ?? [],
          missing_skills: eligibilityDetails?.missingSkills ?? [],
          failed_requirements: eligibilityDetails?.failedRequirements ?? [],
        }
      })
    )

    const mappingIds = jobEntries
      .filter((entry) => entry.mapping !== null)
      .map((entry) => entry.mapping!.id)

    const applicantCounts: Record<string, number> = {}
    if (mappingIds.length > 0) {
      const results = await Promise.allSettled(
        mappingIds.map((id) =>
          supabase.rpc("get_job_applicant_count", { p_job_college_map_id: id })
        )
      )
      results.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value.data !== null) {
          applicantCounts[mappingIds[idx]] = Number(result.value.data) || 0
        } else {
          applicantCounts[mappingIds[idx]] = 0
        }
      })
    }

    const finalJobs = jobEntries.map((entry) => ({
      ...entry,
      applicant_count: entry.mapping
        ? applicantCounts[entry.mapping.id] ?? 0
        : 0,
    }))

    return NextResponse.json({ jobs: finalJobs })
  } catch (error: unknown) {
    console.error("GET /api/students/jobs failed:", error)
    return NextResponse.json(
      { error: "Unable to load jobs" },
      { status: 500 }
    )
  }
}
