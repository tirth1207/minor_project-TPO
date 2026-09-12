import { callNvidiaChat } from "./nvidia"
import { cleanAndParseJson } from "./json-parser"
import type {
  MockInterviewQuestion,
  StudentAnswer,
  MockEvaluationResult,
  QuestionEvaluation,
  MCQQuestion,
} from "@/types/mock-interview"

type EvaluationPayload = {
  id: string
  type: string
  question: string
  skill: string
  pointsPossible: number
  studentResponse: string
  selectedLanguage?: string
  expectedTopics?: string[]
  rubric?: string
  expectedConcepts?: string[]
}

type RawQuestionEvaluation = {
  questionId: string
  pointsEarned: number
  verdict: "strong" | "partial" | "needs-work"
  feedback: string
  strengths: string[]
  improvements: string[]
}

const VALID_VERDICTS = new Set<RawQuestionEvaluation["verdict"]>([
  "strong",
  "partial",
  "needs-work",
])

function isRawQuestionEvaluation(value: unknown): value is RawQuestionEvaluation {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  const questionId = candidate.questionId
  const pointsEarned = candidate.pointsEarned
  const verdict = candidate.verdict
  const feedback = candidate.feedback
  const strengths = candidate.strengths
  const improvements = candidate.improvements

  return (
    typeof questionId === "string" &&
    questionId.trim().length > 0 &&
    Number.isFinite(Number(pointsEarned)) &&
    typeof verdict === "string" &&
    VALID_VERDICTS.has(verdict as RawQuestionEvaluation["verdict"]) &&
    typeof feedback === "string" &&
    Array.isArray(strengths) &&
    strengths.every((item) => typeof item === "string") &&
    Array.isArray(improvements) &&
    improvements.every((item) => typeof item === "string")
  )
}

function buildEvaluationPayload(
  questions: MockInterviewQuestion[],
  answerMap: Map<string, StudentAnswer>
): EvaluationPayload[] {
  return questions.map((q) => {
    const studentAns = answerMap.get(q.id)
    return {
      id: q.id,
      type: q.type,
      question: q.question,
      skill: q.skill || "General Technical",
      pointsPossible: q.points || (q.type === "CODE" ? 15 : 10),
      studentResponse: studentAns?.answerText || "No answer provided",
      selectedLanguage: studentAns?.codeLanguage,
      expectedTopics: "expectedTopics" in q ? q.expectedTopics : undefined,
      rubric: "rubric" in q ? q.rubric : undefined,
      expectedConcepts: "expectedConcepts" in q ? q.expectedConcepts : undefined,
    }
  })
}

async function requestEvaluations(payload: EvaluationPayload[], attemptLabel: string): Promise<RawQuestionEvaluation[]> {
  const ids = payload.map((item) => item.id)

  const systemPrompt = `You are an expert interviewer evaluating candidate answers across THEORY, CODE, and BEHAVIORAL questions.
Evaluate objectively and conservatively using the question type and supplied rubric.

For THEORY questions, evaluate factual correctness, conceptual understanding, reasoning, and relevant edge cases.
For CODE questions, evaluate syntax, logic, correctness, code quality, and edge cases. Do not claim runtime execution or test results that were not actually provided.
For BEHAVIORAL questions, evaluate communication, clarity, ownership, specificity, structure, reflection, and the quality of the situation/action/result described. Prefer evidence-based answers and STAR-style structure, but do not require the candidate to literally label STAR sections. Do not penalize a behavioral answer for lacking technical details unless the question explicitly requires them.

Do not award points merely because an answer contains text. An unanswered or invalid response must receive 0 points.

Return ONLY valid JSON in exactly this shape:
{"evaluations":[{"questionId":"...","pointsEarned":0,"verdict":"strong|partial|needs-work","feedback":"...","strengths":[],"improvements":[]}]}

CRITICAL CONTRACT:
- Evaluate EXACTLY these question IDs: ${ids.join(", ")}
- Return exactly ONE evaluation for EACH supplied ID.
- Never omit an ID.
- Never invent an ID.
- Preserve each question's type when applying its rubric.
- Keep feedback concise so the complete JSON fits in the response.
- If the student did not answer, give 0 points and explain that no answer was provided.
`

  const userPrompt = `Evaluate ONLY these candidate responses. Do not evaluate any other questions.\n${JSON.stringify(payload, null, 2)}`

  try {
    const aiData = await callNvidiaChat("openai/gpt-oss-120b", [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      maxTokens: Math.min(8000, Math.max(3000, payload.length * 1400)),
    })

    const raw = aiData?.choices?.[0]?.message?.content?.trim()
    if (!raw) throw new Error("AI evaluator returned an empty response")

    const parsed = cleanAndParseJson(raw)
    const rawEvaluations = parsed?.evaluations || (Array.isArray(parsed) ? parsed : [])
    if (!Array.isArray(rawEvaluations)) {
      throw new Error("AI evaluator returned an invalid evaluations array")
    }

    const evals = rawEvaluations.filter(isRawQuestionEvaluation)
    const rejectedCount = rawEvaluations.length - evals.length
    if (rejectedCount > 0) {
      console.warn(`[AI Evaluation] ${attemptLabel} rejected ${rejectedCount} malformed evaluation object(s)`)
    }

    console.log(`[AI Evaluation] ${attemptLabel} returned ${evals.length}/${payload.length} valid evaluations`)
    return evals
  } catch (err: unknown) {
    console.error(`[AI Evaluation] ${attemptLabel} failed:`, err)
    const message = err instanceof Error ? err.message : "Evaluator unavailable"
    throw new Error(`AI evaluation failed: ${message}`)
  }
}

function appendEvaluation(
  questionEvaluations: QuestionEvaluation[],
  seen: Set<string>,
  questions: MockInterviewQuestion[],
  evals: RawQuestionEvaluation[]
) {
  for (const ev of evals) {
    const questionId = ev.questionId.trim()
    const matchedQ = questions.find((q) => q.id === questionId)
    if (!matchedQ || seen.has(questionId)) continue

    seen.add(questionId)
    const possible = matchedQ.points || (matchedQ.type === "CODE" ? 15 : 10)
    const numericEarned = Number(ev.pointsEarned)
    const earned = Number.isFinite(numericEarned)
      ? Math.min(possible, Math.max(0, Math.round(numericEarned)))
      : 0

    const verdict =
      earned >= possible * 0.75
        ? "strong"
        : earned >= possible * 0.4
          ? "partial"
          : "needs-work"

    questionEvaluations.push({
      questionId: matchedQ.id,
      type: matchedQ.type,
      pointsPossible: possible,
      pointsEarned: earned,
      verdict,
      feedback: ev.feedback.trim() || "Response evaluated.",
      strengths: ev.strengths.map((item) => item.trim()).filter(Boolean),
      improvements: ev.improvements.map((item) => item.trim()).filter(Boolean),
    })
  }
}

export async function evaluateStructuredMockInterview(
  questions: MockInterviewQuestion[],
  answers: StudentAnswer[],
  passScoreThreshold: number = 70
): Promise<MockEvaluationResult> {
  const answerMap = new Map<string, StudentAnswer>()
  answers.forEach((ans) => {
    if (ans && ans.questionId) answerMap.set(ans.questionId, ans)
  })

  const questionEvaluations: QuestionEvaluation[] = []
  const mcqQuestions: MCQQuestion[] = []
  const nonMcqQuestions: MockInterviewQuestion[] = []
  let totalMcqPossible = 0
  let totalMcqEarned = 0

  for (const q of questions) {
    if (q.type === "MCQ") {
      mcqQuestions.push(q)
      const points = q.points || 10
      totalMcqPossible += points
      const studentAns = answerMap.get(q.id)
      const isCorrect = Boolean(
        studentAns?.selectedOptionId &&
          studentAns.selectedOptionId === q.correctOptionId
      )
      const earned = isCorrect ? points : 0
      totalMcqEarned += earned
      questionEvaluations.push({
        questionId: q.id,
        type: "MCQ",
        pointsPossible: points,
        pointsEarned: earned,
        isCorrect,
        verdict: isCorrect ? "strong" : "needs-work",
        feedback: isCorrect
          ? `Correct answer! ${q.explanation || ""}`
          : `Incorrect. ${q.explanation || ""}`,
        strengths: isCorrect ? [`Understands ${q.skill || "MCQ Concept"}`] : [],
        improvements: !isCorrect ? [`Needs to revise ${q.skill || "MCQ Concept"}`] : [],
      })
    } else {
      nonMcqQuestions.push(q)
    }
  }

  if (nonMcqQuestions.length > 0) {
    const allPayload = buildEvaluationPayload(nonMcqQuestions, answerMap)
    const seen = new Set<string>()

    // Evaluate the full batch first. If the model returns an incomplete batch,
    // retry only the missing IDs instead of failing the whole submission.
    const firstPass = await requestEvaluations(allPayload, "Primary evaluator")
    appendEvaluation(questionEvaluations, seen, nonMcqQuestions, firstPass)

    let missingQuestionIds = nonMcqQuestions
      .map((q) => q.id)
      .filter((id) => !seen.has(id))

    if (missingQuestionIds.length > 0) {
      console.warn(
        `[AI Evaluation] Missing ${missingQuestionIds.length} evaluations. Retrying only: ${missingQuestionIds.join(", ")}`
      )

      const missingPayload = allPayload.filter((item) => missingQuestionIds.includes(item.id))
      const recoveryPass = await requestEvaluations(missingPayload, "Missing-evaluation recovery")
      appendEvaluation(questionEvaluations, seen, nonMcqQuestions, recoveryPass)

      missingQuestionIds = nonMcqQuestions
        .map((q) => q.id)
        .filter((id) => !seen.has(id))
    }

    // Never leave the submit endpoint stuck at 500 because a provider omitted
    // one evaluation. Missing/invalid AI evaluations are conservatively scored
    // as zero and clearly marked, while valid AI evaluations remain untouched.
    for (const questionId of missingQuestionIds) {
      const question = nonMcqQuestions.find((q) => q.id === questionId)
      if (!question) continue

      const possible = question.points || (question.type === "CODE" ? 15 : 10)
      const studentAnswer = answerMap.get(question.id)
      const answered = Boolean(studentAnswer?.answerText?.trim())

      questionEvaluations.push({
        questionId: question.id,
        type: question.type,
        pointsPossible: possible,
        pointsEarned: 0,
        verdict: "needs-work",
        feedback: answered
          ? "This response could not be reliably evaluated by the AI evaluator. No points were awarded; please retry the assessment if you want a fresh evaluation."
          : "No answer provided.",
        strengths: [],
        improvements: answered
          ? [`Retry evaluation for ${question.skill || "this question"}`]
          : [`Answer ${question.skill || "this question"}`],
      })

      seen.add(question.id)
    }
  }

  let totalPossible = 0
  let totalEarned = 0
  let theoryPossible = 0
  let theoryEarned = 0
  let codingPossible = 0
  let codingEarned = 0
  const skillTotals: Record<string, { possible: number; earned: number }> = {}

  questions.forEach((q) => {
    const ev = questionEvaluations.find((e) => e.questionId === q.id)
    const possible = q.points || (q.type === "CODE" ? 15 : 10)
    const earned = ev ? ev.pointsEarned : 0
    totalPossible += possible
    totalEarned += earned

    if (q.type === "CODE") {
      codingPossible += possible
      codingEarned += earned
    } else if (q.type !== "MCQ") {
      theoryPossible += possible
      theoryEarned += earned
    }

    const skill = q.skill || "General Technical"
    if (!skillTotals[skill]) skillTotals[skill] = { possible: 0, earned: 0 }
    skillTotals[skill].possible += possible
    skillTotals[skill].earned += earned
  })

  const overallScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
  const mcqScore = totalMcqPossible > 0 ? Math.round((totalMcqEarned / totalMcqPossible) * 100) : 0
  const theoryScore = theoryPossible > 0 ? Math.round((theoryEarned / theoryPossible) * 100) : 0
  const codingScore = codingPossible > 0 ? Math.round((codingEarned / codingPossible) * 100) : 0
  const skillScores: Record<string, number> = {}

  Object.keys(skillTotals).forEach((skill) => {
    const item = skillTotals[skill]
    skillScores[skill] = item.possible > 0 ? Math.round((item.earned / item.possible) * 100) : 0
  })

  const passed = overallScore >= passScoreThreshold
  const allStrengths = Array.from(new Set(questionEvaluations.flatMap((ev) => ev.strengths))).filter(Boolean)
  const allImprovements = Array.from(new Set(questionEvaluations.flatMap((ev) => ev.improvements))).filter(Boolean)
  const recommendedNextSteps = allImprovements
    .map((imp) => `Focus on improving: ${imp}`)
    .slice(0, 4)

  const summary = passed
    ? `Strong performance! You scored ${overallScore}% overall (MCQ: ${mcqScore}%, Theory: ${theoryScore}%, Coding: ${codingScore}%), passing the required threshold of ${passScoreThreshold}%.`
    : `Your overall score of ${overallScore}% is below the passing threshold of ${passScoreThreshold}%. Review weak areas in ${Object.keys(skillScores).filter((s) => skillScores[s] < 65).join(", ") || "theory/coding"} and retry.`

  return {
    overallScore,
    mcqScore,
    theoryScore,
    codingScore,
    passed,
    summary,
    skillScores,
    strengths: allStrengths.length > 0 ? allStrengths : ["Completed assessment attempt"],
    improvements: allImprovements.length > 0 ? allImprovements : ["Maintain core practice"],
    recommendedNextSteps: recommendedNextSteps.length > 0 ? recommendedNextSteps : ["Practice additional mock tests"],
    questionEvaluations,
  }
}
