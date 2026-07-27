export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 1. Fetch student details
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("id, profile_status, is_placed")
      .eq("user_id", user.id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // 2. Validate Student Approval State
    if (student.profile_status !== "APPROVED") {
      return NextResponse.json(
        { error: "Your profile is pending/rejected. Only APPROVED student profiles can apply for jobs." },
        { status: 400 }
      )
    }

    // 3. Validate Student Placement State
    if (student.is_placed) {
      return NextResponse.json(
        { error: "You are already placed and cannot apply for additional jobs." },
        { status: 400 }
      )
    }

    // 4. Retrieve job mapping and posting details
    const { data: mapping, error: mappingError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        job_id,
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
      .maybeSingle()

    if (mappingError || !mapping) {
      return NextResponse.json({ error: "Job mapping not found" }, { status: 404 })
    }

    const job = mapping.job as any
    if (mapping.local_status !== "APPROVED" || job.global_status !== "APPROVED") {
      return NextResponse.json({ error: "This job mapping is not approved yet" }, { status: 400 })
    }

    let highestMockScore = null

    // 5. Check AI Mock Interview Gate if required
    if (job.require_mock) {
      const { data: mockInterviews, error: mockError } = await supabase
        .from("mock_interviews")
        .select("ai_score")
        .eq("student_id", student.id)
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

    // 6. Create Job Application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .insert({
        student_id: student.id,
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

    // 7. Seed initial application rounds if specified in the job drive
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
