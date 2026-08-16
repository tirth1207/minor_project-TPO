export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    const role = user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Process any REQUESTED mock interviews for this student
    // Set REQUESTED to QUEUED
    await supabase
      .from("mock_interviews")
      .update({ status: "QUEUED" })
      .eq("student_id", student.id)
      .eq("status", "REQUESTED")

    // Fetch all mock interviews for this student
    const { data: mockInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", student.id)
      .order("id", { ascending: false })

    if (fetchError) {
      console.error("Error fetching mock interviews:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ mockInterviews })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth

    const { jobRoleContext } = await request.json()
    if (!jobRoleContext || typeof jobRoleContext !== "string") {
      console.error("Invalid jobRoleContext:", jobRoleContext)
      return NextResponse.json({ error: "jobRoleContext is required" }, { status: 400 })
    }

    const { data: mockInterview, error: insertError } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        job_role_context: jobRoleContext,
        questions: [], // Questions will be generated during processing
        answers: [],
        // status will default to REQUESTED
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting new mock interview:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ mockInterview }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}