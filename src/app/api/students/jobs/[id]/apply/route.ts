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

    // Fetch student's is_placed status
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("is_placed")
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
          rounds
        )
      `)
      .eq("id", id)
      .eq("org_id", orgId) // Secure boundary: student can only apply to mappings belonging to their org!
      .maybeSingle()

    if (mappingError || !mapping) {
      return NextResponse.json({ error: "Job mapping not found or unauthorized access" }, { status: 404 })
    }

    const job = mapping.job as any
    if (mapping.local_status !== "APPROVED" || job.global_status !== "APPROVED") {
      return NextResponse.json({ error: "This job mapping is not approved yet" }, { status: 400 })
    }

    let highestMockScore = null

    // Check AI Mock Interview Gate if required
    if (job.require_mock) {
      const { data: mockInterviews, error: mockError } = await supabase
        .from("mock_interviews")
        .select("ai_score")
        .eq("student_id", studentId)
        .eq("status", "COMPLETED")
        .gte("ai_score", job.mock_pass_score || 50)
        .order("ai_score", { ascending: false })

      if (mockError || !mockInterviews || mockInterviews.length === 0) {
        return NextResponse.json(
          { error: `This job requires a completed AI Mock Interview with a passing score of at least ${job.mock_pass_score || 50}%.` },
          { status: 400 }
        )
      }

      highestMockScore = mockInterviews[0].ai_score
    }

    // Create Job Application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        student_id: studentId,
        job_college_map_id: id,
        mock_score: highestMockScore,
        status: "APPLIED",
      })
      .select()
      .single()

    if (appError) {
      // If error is unique constraint, they've already applied
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
