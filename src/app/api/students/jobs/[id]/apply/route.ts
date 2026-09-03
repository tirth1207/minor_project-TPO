export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

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

    // Fetch student's profile details
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("is_placed, cgpa, active_backlogs, branch, profile_status")
      .eq("id", studentId)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Validate Student Placement State
    if (student.is_placed) {
      return NextResponse.json(
        { error: "You are already placed and cannot apply for additional jobs." },
        { status: 400 }
      )
    }

    // Retrieve job mapping and posting details, verifying it belongs to student's org
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
          job_eligible_branches (
            branch_name
          )
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

    let jobSpecificMockScore: number | null = null

    // Strictly enforce AI Mock Interview Gate for JOB_REQUIRED interviews
    if (job.require_mock) {
      const requiredPassScore = job.mock_pass_score || 70

      // Search for evaluated JOB_REQUIRED mock for this exact job mapping
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
            error: `This job requires you to complete and pass a job-specific AI mock assessment before applying.`,
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

    // Create Job Application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        student_id: studentId,
        job_college_map_id: id,
        mock_score: jobSpecificMockScore,
        status: "APPLIED",
      })
      .select()
      .single()

    if (appError) {
      if (appError.code === "23505") {
        return NextResponse.json({ error: "You have already applied for this job." }, { status: 400 })
      }
      return NextResponse.json({ error: appError.message }, { status: 400 })
    }

    // Seed initial application rounds if specified in the job drive
    let jobRounds = []
    try {
      jobRounds = typeof job.rounds === "string" ? JSON.parse(job.rounds) : job.rounds
    } catch {
      jobRounds = job.rounds || []
    }

    const roundsToInsert = (Array.isArray(jobRounds) && jobRounds.length > 0)
      ? jobRounds.map((r: any) => ({
          application_id: application.id,
          round_name: typeof r === "string" ? r : (r.name || "Interview Round"),
          status: "PENDING",
        }))
      : [
          {
            application_id: application.id,
            round_name: "Resume Screening",
            status: "PENDING",
          },
          {
            application_id: application.id,
            round_name: "Technical Interview",
            status: "PENDING",
          },
          {
            application_id: application.id,
            round_name: "HR Round",
            status: "PENDING",
          }
        ]

    await supabase.from("application_rounds").insert(roundsToInsert)

    return NextResponse.json({ application, message: "Applied successfully!" }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
