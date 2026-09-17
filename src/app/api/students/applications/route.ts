export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get the student's profile id
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Retrieve all applications sent by this student, including round states and offer details
    const { data: applications, error: fetchError } = await supabase
      .from("applications")
      .select(`
        id,
        student_id,
        job_college_map_id,
        status,
        applied_at,
        mock_score,
        job_college_mapping:job_college_mappings(
          id,
          local_status,
          job:job_postings(
            id,
            title,
            description,
            ctc_min,
            ctc_max,
            location,
            work_mode,
            company:company_profiles(
              id,
              company_name,
              website
            )
          )
        ),
        rounds:application_rounds(
          id,
          round_name,
          status,
          company_feedback
        ),
        offers:offers(
          id,
          ctc_offered,
          status,
          extended_at,
          decided_at
        )
      `)
      .eq("student_id", student.id)
      .order("applied_at", { ascending: false })

    if (fetchError) {
      console.error("Student applications fetch error:", fetchError)
      return NextResponse.json({ error: "Unable to load student applications" }, { status: 500 })
    }

    return NextResponse.json({ applications: applications ?? [] })
  } catch (error: unknown) {
    console.error("GET /api/students/applications failed:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
