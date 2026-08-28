export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import type { MockInterviewQuestion } from "@/types/mock-interview"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth

    const { data: mocks, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: error.message },
        { status: 500 }
      )
    }

    const mockList = mocks || []
    return NextResponse.json({
      success: true,
      data: { mocks: mockList },
      mocks: mockList,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-create:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth
    const body = await request.json().catch(() => ({}))

    const role = (body.role || "Full Stack Developer").trim()

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
      console.warn("[Mock Creation] Inline generation failed, setting state to QUEUED:", genErr)
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
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { mock: mockRecord },
        mock: mockRecord,
        message: "Practice mock interview session created",
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
