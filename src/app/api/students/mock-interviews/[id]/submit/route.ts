export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { evaluateStructuredMockInterview } from "@/lib/ai/mock-interview-evaluator"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import type { StudentAnswer } from "@/types/mock-interview"

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

    const rateLimit = checkRateLimit(`mock-submit:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth
    const body = await request.json().catch(() => ({}))

    const submittedAnswers: StudentAnswer[] = Array.isArray(body.answers) ? body.answers : []

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

    if (mock.status === "EVALUATED") {
      return NextResponse.json(
        { success: false, code: "ALREADY_EVALUATED", error: "Mock interview has already been evaluated" },
        { status: 400 }
      )
    }

    // Step 1: GUARANTEE Candidate answers are persisted BEFORE evaluation is attempted
    const { error: saveAnswersError } = await supabase
      .from("mock_interviews")
      .update({
        status: "EVALUATING",
        answers: submittedAnswers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("student_id", studentId)

    if (saveAnswersError) {
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Failed to persist answers prior to evaluation" },
        { status: 500 }
      )
    }

    // Determine target pass threshold
    let passThreshold = 70
    if (mock.mock_type === "JOB_REQUIRED" && mock.job_spec_snapshot) {
      passThreshold = mock.job_spec_snapshot.mockPassScore || 70
    }

    const questions = Array.isArray(mock.questions) ? mock.questions : []

    try {
      const evalResult = await evaluateStructuredMockInterview(
        questions,
        submittedAnswers,
        passThreshold
      )

      const now = new Date().toISOString()
      const { data: updatedMock, error: updateError } = await supabase
        .from("mock_interviews")
        .update({
          status: "EVALUATED",
          overall_score: evalResult.overallScore,
          ai_score: evalResult.overallScore,
          mcq_score: evalResult.mcqScore,
          theory_score: evalResult.theoryScore,
          coding_score: evalResult.codingScore,
          skill_scores: evalResult.skillScores,
          passed: evalResult.passed,
          ai_feedback: evalResult.summary,
          ai_summary: evalResult.summary,
          ai_results: evalResult,
          completed_at: now,
          updated_at: now,
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
        data: {
          mock: updatedMock,
          result: evalResult,
        },
        mock: updatedMock,
        result: evalResult,
        message: "Assessment submitted and evaluated successfully!",
      })
    } catch (evalErr: any) {
      console.error("[Mock Submit] Evaluation error, preserving answers:", evalErr)

      // Revert status to ANSWERING so student can retry evaluation without losing answers
      await supabase
        .from("mock_interviews")
        .update({
          status: "ANSWERING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("student_id", studentId)

      return NextResponse.json(
        {
          success: false,
          code: "EVALUATION_FAILED",
          error: evalErr?.message || "AI evaluation failed. Candidate answers have been preserved. Please retry submission.",
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
