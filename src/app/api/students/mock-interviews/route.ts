export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview"
import type { MockInterviewQuestion } from "@/types/mock-interview"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth

    const { data: mocks, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ mocks: mocks || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth
    const body = await request.json()

    const role = body.role || "Full Stack Developer"

    // Fetch career profile for context
    const { data: careerProfile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    let generatedQuestions: MockInterviewQuestion[] = []
    let initialStatus = "ANSWERING"

    try {
      generatedQuestions = await generateStructuredMockInterview(
        "PRACTICE",
        role,
        null,
        careerProfile
      )
    } catch (genErr) {
      console.warn("Direct generation failed, fallback to QUEUED mode:", genErr)
      initialStatus = "QUEUED"
    }

    const { data: mockRecord, error } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        mock_type: "PRACTICE",
        job_role_context: role,
        questions: generatedQuestions,
        status: initialStatus,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ mock: mockRecord, message: "Practice mock interview created" }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
