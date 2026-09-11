import { callNvidiaChat } from "./nvidia"
import { cleanAndParseJson } from "./json-parser"
import type {
  MockInterviewQuestion,
  StudentAnswer,
  MockEvaluationResult,
  QuestionEvaluation,
  MCQQuestion,
} from "@/types/mock-interview"

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
      const isCorrect = Boolean(studentAns?.selectedOptionId && studentAns.selectedOptionId === q.correctOptionId)
      const earned = isCorrect ? points : 0
      totalMcqEarned += earned
      questionEvaluations.push({
        questionId: q.id,
        type: "MCQ",
        pointsPossible: points,
        pointsEarned: earned,
        isCorrect,
        verdict: isCorrect ? "strong" : "needs-work",
        feedback: isCorrect ? `Correct answer! ${q.explanation || ""}` : `Incorrect. ${q.explanation || ""}`,
        strengths: isCorrect ? [`Understands ${q.skill || "MCQ Concept"}`] : [],
        improvements: !isCorrect ? [`Needs to revise ${q.skill || "MCQ Concept"}`] : [],
      })
    } else {
      nonMcqQuestions.push(q)
    }
  }

  if (nonMcqQuestions.length > 0) {
    const nonMcqPayload = nonMcqQuestions.map((q) => {
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

    const systemPrompt = `You are an expert technical interviewer evaluating candidate answers (THEORY and CODE).
Evaluate objectively using correctness, technical reasoning, edge cases, and code quality.
Do not award points merely because an answer contains text. An unanswered or invalid response must receive 0 points.
For CODE questions, do not claim runtime execution or test results that were not actually provided. Evaluate conservatively for syntax, logic, correctness and edge cases.
Return ONLY JSON with an evaluations array. Return exactly one evaluation for every supplied question ID and no other IDs.`
    const userPrompt = `Evaluate these candidate responses:\n${JSON.stringify(nonMcqPayload, null, 2)}`

    const seen = new Set<string>()
    let evals: any[]
    try {
      const aiData = await callNvidiaChat("openai/gpt-oss-120b", [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ])
      const raw = aiData?.choices?.[0]?.message?.content?.trim()
      if (!raw) throw new Error("AI evaluator returned an empty response")
      const parsed = cleanAndParseJson(raw)
      evals = parsed.evaluations || (Array.isArray(parsed) ? parsed : [])
      if (!Array.isArray(evals)) throw new Error("AI evaluator returned an invalid evaluations array")
    } catch (err: any) {
      console.error("[AI Evaluation] Non-MCQ evaluation failed:", err)
      throw new Error(`AI evaluation failed: ${err?.message || "Evaluator unavailable"}`)
    }

    for (const ev of evals) {
      const questionId = String(ev?.questionId || "")
      const matchedQ = nonMcqQuestions.find((q) => q.id === questionId)
      if (!matchedQ || seen.has(questionId)) continue
      seen.add(questionId)
      const possible = matchedQ.points || (matchedQ.type === "CODE" ? 15 : 10)
      const numericEarned = Number(ev.pointsEarned)
      const earned = Number.isFinite(numericEarned) ? Math.min(possible, Math.max(0, Math.round(numericEarned))) : 0
      questionEvaluations.push({
        questionId: matchedQ.id,
        type: matchedQ.type,
        pointsPossible: possible,
        pointsEarned: earned,
        verdict: ev.verdict || (earned >= possible * 0.75 ? "strong" : earned >= possible * 0.4 ? "partial" : "needs-work"),
        feedback: typeof ev.feedback === "string" ? ev.feedback : "Response evaluated.",
        strengths: Array.isArray(ev.strengths) ? ev.strengths.filter(Boolean) : [],
        improvements: Array.isArray(ev.improvements) ? ev.improvements.filter(Boolean) : [],
      })
    }

    const missingQuestionIds = nonMcqQuestions.map((q) => q.id).filter((id) => !seen.has(id))
    if (missingQuestionIds.length > 0) {
      throw new Error(`AI evaluator omitted question evaluations: ${missingQuestionIds.join(", ")}`)
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
  const recommendedNextSteps = allImprovements.map((imp) => `Focus on improving: ${imp}`).slice(0, 4)
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
