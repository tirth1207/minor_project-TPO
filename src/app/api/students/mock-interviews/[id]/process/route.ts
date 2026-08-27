export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-process:${id}`, { windowMs: 60 * 1000, maxRequests: 10 })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth

    // 1. Fetch mock interview belonging to candidate
    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (fetchError || !mock) {
      return NextResponse.json(
        { success: false, error: "Mock interview session not found", code: "MOCK_NOT_FOUND" },
        { status: 404 }
      )
    }

    // Check if already ready
    if (mock.status === "ANSWERING" && Array.isArray(mock.questions) && mock.questions.length > 0) {
      return NextResponse.json({
        success: true,
        status: "ANSWERING",
        mock,
        message: "Mock interview assessment is already prepared and ready.",
      })
    }

    // Check if already evaluated
    if (mock.status === "EVALUATED") {
      return NextResponse.json({
        success: true,
        status: "EVALUATED",
        mock,
        message: "Mock interview assessment has already been completed and evaluated.",
      })
    }

    // 2. Recovery / Stale processing check (if in PROCESSING for > 2 minutes, allow retry)
    const isStaleProcessing =
      mock.status === "PROCESSING" &&
      mock.updated_at &&
      Date.now() - new Date(mock.updated_at).getTime() > 2 * 60 * 1000

    if (mock.status !== "QUEUED" && mock.status !== "FAILED" && !isStaleProcessing) {
      return NextResponse.json({
        success: true,
        status: mock.status,
        mock,
        message: `Assessment is currently in ${mock.status} state.`,
      })
    }

    // 3. Atomic status transition QUEUED / FAILED / STALE_PROCESSING -> PROCESSING
    const { data: updatedMock, error: lockError } = await supabase
      .from("mock_interviews")
      .update({
        status: "PROCESSING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("student_id", studentId)
      .select()
      .single()

    if (lockError || !updatedMock) {
      return NextResponse.json(
        { success: false, error: "Concurrent generation in progress", code: "CONCURRENT_PROCESSING" },
        { status: 409 }
      )
    }

    console.log(`[MOCK_PROCESS_START] id=${id} student=${studentId} type=${updatedMock.mock_type}`)

    // 4. Generate structured questions
    try {
      const mockType = updatedMock.mock_type || "PRACTICE"
      const jobRole = updatedMock.job_role_context || "Software Engineer"
      const jobInfo = updatedMock.job_spec_snapshot

      const questions = await generateStructuredMockInterview(
        mockType,
        jobRole,
        jobInfo
      )

      if (!questions || questions.length === 0) {
        throw new Error("Generated question set is empty")
      }

      // 5. Save questions and transition status PROCESSING -> ANSWERING
      const { data: finalMock, error: saveError } = await supabase
        .from("mock_interviews")
        .update({
          questions,
          status: "ANSWERING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (saveError) {
        throw new Error(`Database error saving questions: ${saveError.message}`)
      }

      console.log(`[MOCK_PROCESS_SUCCESS] id=${id} questionsCount=${questions.length}`)

      return NextResponse.json({
        success: true,
        status: "ANSWERING",
        mock: finalMock,
        message: "AI Mock Interview assessment generated successfully!",
      })
    } catch (genErr: any) {
      console.error(`[MOCK_PROCESS_FAIL] id=${id} error="${genErr?.message}"`)

      // Failure path: PROCESSING -> FAILED
      const { data: failedMock } = await supabase
        .from("mock_interviews")
        .update({
          status: "FAILED",
          ai_summary: `AI generation failed: ${genErr?.message || "Unknown error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          mock: failedMock,
          error: "Assessment preparation failed. You can safely click retry.",
          code: "GENERATION_FAILED",
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error("[MOCK_PROCESS_FATAL]", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
