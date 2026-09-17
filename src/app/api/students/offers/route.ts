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

    // Retrieve all offers extended to this student
    const { data: offers, error: fetchError } = await supabase
      .from("offers")
      .select(`
        id,
        ctc_offered,
        status,
        extended_at,
        decided_at,
        application:applications!inner(
          id,
          status,
          applied_at,
          student_id,
          job_college_mapping:job_college_mappings!inner(
            id,
            job:job_postings!inner(
              id,
              title,
              description,
              ctc_min,
              ctc_max,
              location,
              work_mode,
              company:company_profiles!inner(
                id,
                company_name,
                website
              )
            )
          )
        )
      `)
      .eq("application.student_id", student.id)
      .order("extended_at", { ascending: false })

    if (fetchError) {
      console.error("Student offers fetch error:", fetchError)
      return NextResponse.json({ error: "Unable to load student offers" }, { status: 500 })
    }

    return NextResponse.json({ offers: offers ?? [] })
  } catch (error: unknown) {
    console.error("GET /api/students/offers failed:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
