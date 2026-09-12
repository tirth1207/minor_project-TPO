export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { evaluateStructuredMockInterview } from "@/lib/ai/mock-interview-evaluator"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import type { StudentAnswer } from "@/types/mock-interview"

const MAX_ANSWER_LENGTH = 20000
const EVALUATION_LEASE_MS = 10 * 60 * 1000

type MockQuestion = {
  id: string
  type?: string
  options?: Array<{ id: string }>
  [key: string]: unknown
}

function validateSubmittedAnswers(questions: MockQuestion[], answers: unknown): answers is StudentAnswer[] {
  if (!Array.isArray(answers) || answers.length !== questions.length) return false
  const questionMap = new Map(questions.map((q) => [String(q.id), q]))
  const seen = new Set<string>()

  for (const answer of answers) {
    if (!answer || typeof answer !== "object") return false
    const item = answer as Record<string, unknown>
    const questionId = typeof item.questionId === "string" ? item.questionId : ""
    if (!questionId || seen.has(questionId) || !questionMap.has(questionId)) return false
    seen.add(questionId)
    if (item.answerText !== undefined && typeof item.answerText !== "string") return false
    if (typeof item.answerText === "string" && item.answerText.length > MAX_ANSWER_LENGTH) return false
    if (item.selectedOptionId !== undefined && typeof item.selectedOptionId !== "string") return false
    if (item.codeLanguage !== undefined && typeof item.codeLanguage !== "string") return false

    const question = questionMap.get(questionId)
    if (question?.type === "MCQ" && item.selectedOptionId !== undefined) {
      const optionIds = Array.isArray(question.options) ? question.options.map((o) => String(o.id)) : []
      if (!optionIds.includes(String(item.selectedOptionId))) return false
    }
  }

  return seen.size === questions.length
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) return NextResponse.json({ success: false, code: "UNAUTHORIZED", error: auth.error }, { status: auth.status })

    const rateLimit = checkRateLimit(`mock-submit:${auth.user.id}`, { windowMs: 60 * 1000, maxRequests: 5 })
    if (!rateLimit.success) return rateLimitResponse()

    const { supabase, studentId } = auth
    const body = await request.json().catch(() => ({}))
    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (fetchError || !mock) return NextResponse.json({ success: false, code: "NOT_FOUND", error: "Mock interview session not found" }, { status: 404 })

    if (mock.status === "EVALUATED") return NextResponse.json({ success: false, code: "ALREADY_EVALUATED", error: "Mock interview has already been evaluated" }, { status: 400 })

    if (mock.status === "EVALUATING") {
      const updatedAt = mock.updated_at ? new Date(mock.updated_at).getTime() : 0
      if (updatedAt && Date.now() - updatedAt <= EVALUATION_LEASE_MS) {
        return NextResponse.json({ success: false, code: "EVALUATION_IN_PROGRESS", error: "This assessment is already being evaluated. Please wait for the result." }, { status: 409 })
      }

      const { data: recovered } = await supabase
        .from("mock_interviews")
        .update({ status: "ANSWERING", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("student_id", studentId)
        .eq("status", "EVALUATING")
        .lt("updated_at", new Date(Date.now() - EVALUATION_LEASE_MS).toISOString())
        .select("id")
        .maybeSingle()

      if (!recovered) return NextResponse.json({ success: false, code: "EVALUATION_IN_PROGRESS", error: "This assessment is already being evaluated. Please wait for the result." }, { status: 409 })
    }

    const { data: readyMock, error: readyError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (readyError || !readyMock) return NextResponse.json({ success: false, code: "NOT_FOUND", error: "Mock interview session not found" }, { status: 404 })
    if (readyMock.status !== "ANSWERING") return NextResponse.json({ success: false, code: "NOT_READY", error: "Interview questions are not ready for submission yet" }, { status: 409 })
    if (!Array.isArray(readyMock.questions) || readyMock.questions.length < 3) return NextResponse.json({ success: false, code: "QUESTIONS_UNAVAILABLE", error: "This interview does not have enough questions to submit" }, { status: 409 })

    const submittedAnswers = body.answers
    if (!validateSubmittedAnswers(readyMock.questions as MockQuestion[], submittedAnswers)) {
      return NextResponse.json({ success: false, code: "INVALID_ANSWERS", error: "Submit exactly one answer for every interview question." }, { status: 400 })
    }

    const { data: claimedMock, error: claimError } = await supabase
      .from("mock_interviews")
      .update({ status: "EVALUATING", answers: submittedAnswers, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("student_id", studentId)
      .eq("status", "ANSWERING")
      .select("id")
      .maybeSingle()

    if (claimError) return NextResponse.json({ success: false, code: "DB_ERROR", error: "Failed to start evaluation" }, { status: 500 })
    if (!claimedMock) return NextResponse.json({ success: false, code: "EVALUATION_IN_PROGRESS", error: "This assessment is already being evaluated. Please wait for the result." }, { status: 409 })

    const passThreshold = readyMock.mock_type === "JOB_REQUIRED" && readyMock.job_spec_snapshot
      ? readyMock.job_spec_snapshot.mockPassScore || 70
      : 70

    try {
      const evalResult = await evaluateStructuredMockInterview(readyMock.questions, submittedAnswers, passThreshold)
      const now = new Date().toISOString()
      const { data: updatedMock, error: updateError } = await supabase
        .from("mock_interviews")
        .update({ status: "EVALUATED", overall_score: evalResult.overallScore, ai_score: evalResult.overallScore, mcq_score: evalResult.mcqScore, theory_score: evalResult.theoryScore, coding_score: evalResult.codingScore, skill_scores: evalResult.skillScores, passed: evalResult.passed, ai_feedback: evalResult.summary, ai_summary: evalResult.summary, ai_results: evalResult, completed_at: now, updated_at: now })
        .eq("id", id)
        .eq("student_id", studentId)
        .eq("status", "EVALUATING")
        .select()
        .single()
      if (updateError || !updatedMock) throw new Error("Evaluation ownership was lost before result persistence")

      return NextResponse.json({ success: true, data: { mock: updatedMock, result: evalResult }, message: "Assessment submitted and evaluated successfully!" })
    } catch (evalErr: unknown) {
      console.error("[Mock Submit] Evaluation error, preserving answers:", evalErr)
      await supabase.from("mock_interviews").update({ status: "ANSWERING", updated_at: new Date().toISOString() }).eq("id", id).eq("student_id", studentId).eq("status", "EVALUATING")
      return NextResponse.json({ success: false, code: "EVALUATION_FAILED", error: "AI evaluation failed. Your answers were preserved; please retry submission." }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error("[Mock Submit] Unexpected error:", err)
    return NextResponse.json({ success: false, code: "SERVER_ERROR", error: "Internal server error" }, { status: 500 })
  }
}
