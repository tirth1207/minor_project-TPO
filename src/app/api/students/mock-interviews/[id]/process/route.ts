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
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-process:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth

    // Fetch mock record to check current state
    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (fetchError || !mock) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Mock interview session not found" },
        { status: 404 }
      )
    }

    // If already generated or evaluated, return immediately
    if (mock.status === "ANSWERING" || mock.status === "EVALUATED") {
      return NextResponse.json({
        success: true,
        data: { mock },
      })
    }

    // Atomic state update to lock for processing
    const nowIso = new Date().toISOString()
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const { data: lockedMock } = await supabase
      .from("mock_interviews")
      .update({ status: "PROCESSING", updated_at: nowIso })
      .eq("id", id)
      .eq("student_id", studentId)
      .or(`status.in.(QUEUED,REQUESTED,FAILED),and(status.eq.PROCESSING,updated_at.lt.${staleThreshold})`)
      .select()
      .maybeSingle()

    // If another request is currently processing, return current status
    if (!lockedMock && mock.status === "PROCESSING") {
      return NextResponse.json({
        success: true,
        data: { mock, inProgress: true },
      })
    }

    const activeMock = lockedMock || mock

    // Fetch career profile for context
    const { data: careerProfile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    try {
      let generatedQuestions = []
      if (activeMock.mock_type === "JOB_REQUIRED") {
        generatedQuestions = await generateStructuredMockInterview(
          "JOB_REQUIRED",
          activeMock.job_role_context || "Job Candidate",
          activeMock.job_spec_snapshot
        )
      } else {
        generatedQuestions = await generateStructuredMockInterview(
          "PRACTICE",
          activeMock.job_role_context || "Full Stack Developer",
          null,
          careerProfile
        )
      }

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length < 3) {
        throw new Error("AI failed to generate sufficient valid interview questions (minimum 3 required)")
      }

      const { data: updatedMock, error: updateError } = await supabase
        .from("mock_interviews")
        .update({
          status: "ANSWERING",
          questions: generatedQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("student_id", studentId)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      return NextResponse.json({
        success: true,
        data: { mock: updatedMock },
        message: "Interview questions generated successfully",
      })
    } catch (genErr: any) {
      console.error("[Mock Process] Generation error:", genErr)

      const { data: failedMock } = await supabase
        .from("mock_interviews")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("student_id", studentId)
        .select()
        .single()

      return NextResponse.json(
        {
          success: false,
          code: "GENERATION_FAILED",
          error: genErr?.message || "Failed to generate interview questions",
          data: { mock: failedMock || activeMock },
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
