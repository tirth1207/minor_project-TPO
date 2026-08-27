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
        { success: false, error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-submit:${id}`, { windowMs: 60 * 1000, maxRequests: 5 })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth
    const body = await request.json()

    const submittedAnswers: StudentAnswer[] = Array.isArray(body.answers) ? body.answers : []

    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (fetchError || !mock) {
      return NextResponse.json(
        { success: false, error: "Mock interview not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    if (mock.status === "EVALUATED") {
      return NextResponse.json({
        success: true,
        status: "EVALUATED",
        mock,
        result: mock.ai_results,
        message: "Assessment has already been submitted and evaluated.",
      })
    }

    // Atomic update to EVALUATING, saving submitted answers
    const { data: lockMock, error: lockError } = await supabase
      .from("mock_interviews")
      .update({
        status: "EVALUATING",
        answers: submittedAnswers.length > 0 ? submittedAnswers : mock.answers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("student_id", studentId)
      .select()
      .single()

    if (lockError || !lockMock) {
      return NextResponse.json(
        { success: false, error: "Assessment submission is currently being evaluated", code: "CONCURRENT_SUBMISSION" },
        { status: 409 }
      )
    }

    // Determine target pass threshold
    let passThreshold = 70
    if (lockMock.mock_type === "JOB_REQUIRED" && lockMock.job_spec_snapshot) {
      passThreshold = lockMock.job_spec_snapshot.mockPassScore || 70
    }

    const questions = Array.isArray(lockMock.questions) ? lockMock.questions : []
    const answersToEval = (Array.isArray(lockMock.answers) && lockMock.answers.length > 0)
      ? lockMock.answers
      : submittedAnswers

    try {
      console.log(`[MOCK_EVAL_START] id=${id} questions=${questions.length} answers=${answersToEval.length}`)
      const evalResult = await evaluateStructuredMockInterview(
        questions,
        answersToEval,
        passThreshold
      )

      const now = new Date().toISOString()
      // Synchronize all scoring fields in database record
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
        .select()
        .single()

      if (updateError) {
        throw new Error(`Database error saving evaluation results: ${updateError.message}`)
      }

      console.log(`[MOCK_EVAL_SUCCESS] id=${id} overallScore=${evalResult.overallScore} passed=${evalResult.passed}`)

      return NextResponse.json({
        success: true,
        status: "EVALUATED",
        mock: updatedMock,
        result: evalResult,
        message: "Assessment submitted and evaluated successfully!",
      })
    } catch (evalErr: any) {
      console.error(`[MOCK_EVAL_FAIL] id=${id} error="${evalErr?.message}"`)

      // Preserve submitted answers, set status to FAILED or allow retry evaluation
      const { data: failedMock } = await supabase
        .from("mock_interviews")
        .update({
          status: "FAILED",
          ai_summary: `Evaluation failed: ${evalErr?.message || "AI Evaluation error"}. Answers preserved.`,
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
          error: "AI evaluation failed. Your typed answers are safely saved. Click retry evaluation.",
          code: "EVALUATION_FAILED",
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error("[MOCK_SUBMIT_FATAL]", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
