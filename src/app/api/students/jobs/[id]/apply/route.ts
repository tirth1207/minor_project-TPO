export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { checkStudentEligibility } from "@/lib/eligibility/check-student-eligibility"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId, orgId } = auth

    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("is_placed, cgpa, active_backlogs, branch, profile_status")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    if (student.is_placed) {
      return NextResponse.json(
        { error: "You are already placed and cannot apply for additional jobs." },
        { status: 400 }
      )
    }

    const { data: mapping, error: mappingError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        job_id,
        org_id,
        local_status,
        job:job_postings!inner(
          id,
          require_mock,
          mock_pass_score,
          global_status,
          rounds,
          min_cgpa,
          max_backlogs,
          job_eligible_branches (branch_name)
        )
      `)
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle()

    if (mappingError || !mapping) {
      return NextResponse.json({ error: "Job mapping not found or unauthorized access" }, { status: 404 })
    }

    const job = mapping.job as any
    if (mapping.local_status !== "APPROVED" || job.global_status !== "APPROVED") {
      return NextResponse.json({ error: "This job mapping is not approved yet" }, { status: 400 })
    }

    // Never trust client-side eligibility flags. Re-run the database eligibility
    // rule immediately before creating the application.
    let eligible: boolean
    try {
      eligible = await checkStudentEligibility(supabase, studentId, job.id)
    } catch (eligibilityError: any) {
      return NextResponse.json(
        { code: "ELIGIBILITY_CHECK_FAILED", error: eligibilityError?.message || "Unable to verify eligibility" },
        { status: 503 }
      )
    }

    if (!eligible) {
      return NextResponse.json(
        { code: "NOT_ELIGIBLE", error: "You do not meet this job drive's eligibility criteria." },
        { status: 403 }
      )
    }

    let jobSpecificMockScore: number | null = null

    if (job.require_mock) {
      const requiredPassScore = job.mock_pass_score || 70

      const { data: jobMocks, error: mockError } = await supabase
        .from("mock_interviews")
        .select("id, overall_score, ai_score, passed, status, mock_type")
        .eq("student_id", studentId)
        .eq("job_college_mapping_id", id)
        .eq("mock_type", "JOB_REQUIRED")
        .eq("status", "EVALUATED")
        .order("overall_score", { ascending: false })

      if (mockError || !jobMocks || jobMocks.length === 0) {
        return NextResponse.json(
          {
            code: "MOCK_INTERVIEW_REQUIRED",
            error: "This job requires you to complete and pass a job-specific AI mock assessment before applying.",
            jobMappingId: id,
            requiredScore: requiredPassScore,
          },
          { status: 400 }
        )
      }

      const bestAttempt = jobMocks[0]
      const bestScore = bestAttempt.overall_score ?? bestAttempt.ai_score ?? 0

      if (bestScore < requiredPassScore || !bestAttempt.passed) {
        return NextResponse.json(
          {
            code: "MOCK_INTERVIEW_FAILED",
            error: `Your score on the job mock assessment (${bestScore}%) is below the required passing score (${requiredPassScore}%). Please retake the assessment before applying.`,
            score: bestScore,
            requiredScore: requiredPassScore,
            jobMappingId: id,
          },
          { status: 400 }
        )
      }

      jobSpecificMockScore = bestScore
    }

    let jobRounds: unknown = []
    try {
      jobRounds = typeof job.rounds === "string" ? JSON.parse(job.rounds) : job.rounds
    } catch {
      jobRounds = job.rounds || []
    }

    const roundNames = (Array.isArray(jobRounds) && jobRounds.length > 0)
      ? jobRounds.map((round: unknown) => {
          if (typeof round === "string") return round
          if (round && typeof round === "object" && "name" in round) {
            const name = (round as { name?: unknown }).name
            return typeof name === "string" ? name : "Interview Round"
          }
          return "Interview Round"
        })
      : []

    const { data: applicationId, error: applicationError } = await supabase.rpc(
      "create_student_application",
      {
        p_student_id: studentId,
        p_job_college_map_id: id,
        p_mock_score: jobSpecificMockScore,
        p_round_names: roundNames,
      }
    )

    if (applicationError || !applicationId) {
      if (applicationError?.code === "23505") {
        return NextResponse.json({ error: "You have already applied for this job." }, { status: 400 })
      }
      console.error("Atomic student application creation failed", applicationError)
      return NextResponse.json(
        { error: "Unable to create your application. Please try again." },
        { status: 400 }
      )
    }

    const { data: application, error: applicationFetchError } = await supabase
      .from("applications")
      .select()
      .eq("id", applicationId)
      .single()

    if (applicationFetchError || !application) {
      console.error("Application was created but could not be read back", applicationFetchError)
      return NextResponse.json(
        { error: "Application was created, but we could not load it. Please refresh your applications." },
        { status: 500 }
      )
    }

    return NextResponse.json({ application, message: "Applied successfully!" }, { status: 201 })
  } catch (error: any) {
    console.error("Student application request failed", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
