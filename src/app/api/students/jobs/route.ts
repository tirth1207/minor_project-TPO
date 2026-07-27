export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Retrieve the student's profile details
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("id, cgpa, active_backlogs, branch, user:users!inner(org_id)")
      .eq("user_id", user.id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const org_id = (student.user as any)?.org_id

    // Fetch all mappings that are APPROVED and correspond to the student's college
    const { data: mappings, error: mappingsError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        job_id,
        org_id,
        local_status,
        job:job_postings!inner(
          id,
          title,
          description,
          ctc_min,
          ctc_max,
          location,
          work_mode,
          min_cgpa,
          max_backlogs,
          global_status,
          require_mock,
          mock_pass_score,
          company:company_profiles(
            id,
            company_name,
            website
          ),
          branches:job_eligible_branches(
            branch_name
          )
        )
      `)
      .eq("org_id", org_id)
      .eq("local_status", "APPROVED")
      .eq("job.global_status", "APPROVED")

    if (mappingsError) {
      return NextResponse.json({ error: mappingsError.message }, { status: 400 })
    }

    const eligibleMappings = []

    for (const mapping of (mappings || [])) {
      const job = mapping.job as any
      if (!job) continue

      // CGPA Check
      if (student.cgpa < job.min_cgpa) continue

      // Backlogs Check
      if (student.active_backlogs > job.max_backlogs) continue

      // Branch Check
      const eligibleBranches = job.branches?.map((b: any) => b.branch_name) || []
      if (!eligibleBranches.includes(student.branch)) continue

      // Call database rpc helper for applicant count
      const { data: applicantCount } = await supabase.rpc(
        "get_job_applicant_count",
        { p_job_college_map_id: mapping.id }
      )

      eligibleMappings.push({
        ...mapping,
        applicant_count: applicantCount || 0,
      })
    }

    return NextResponse.json({ mappings: eligibleMappings })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
