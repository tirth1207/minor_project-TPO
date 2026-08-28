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
    if (ans && ans.questionId) {
      answerMap.set(ans.questionId, ans)
    }
  })

  const questionEvaluations: QuestionEvaluation[] = []
  const mcqQuestions: MCQQuestion[] = []
  const nonMcqQuestions: MockInterviewQuestion[] = []

  let totalMcqPossible = 0
  let totalMcqEarned = 0

  // 1. Process MCQs deterministically
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

  // 2. Evaluate Non-MCQ questions (Theory and Coding) using NVIDIA NIM if any exist
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
Evaluate each question objectively based on correctness, technical reasoning, edge cases, and code quality.

Return ONLY a JSON object formatted as follows without markdown or code fences:
{
  "evaluations": [
    {
      "questionId": "q2",
      "pointsEarned": 8,
      "verdict": "strong",
      "feedback": "Concise feedback on accuracy and reasoning...",
      "strengths": ["Clear explanation"],
      "improvements": ["Mention performance trade-offs"]
    }
  ]
}`

    const userPrompt = `Evaluate the following candidate responses:
${JSON.stringify(nonMcqPayload, null, 2)}`

    try {
      const aiData = await callNvidiaChat("openai/gpt-oss-120b", [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ])

      const raw = aiData?.choices?.[0]?.message?.content?.trim()
      if (raw) {
        const parsed = cleanAndParseJson(raw)
        const evals = parsed.evaluations || (Array.isArray(parsed) ? parsed : [])
        if (Array.isArray(evals)) {
          evals.forEach((ev: any) => {
            const matchedQ = nonMcqQuestions.find((q) => q.id === String(ev.questionId))
            if (matchedQ) {
              const possible = matchedQ.points || (matchedQ.type === "CODE" ? 15 : 10)
              const earned = Math.min(possible, Math.max(0, Number(ev.pointsEarned) || 0))
              questionEvaluations.push({
                questionId: matchedQ.id,
                type: matchedQ.type,
                pointsPossible: possible,
                pointsEarned: earned,
                verdict: ev.verdict || (earned >= possible * 0.75 ? "strong" : earned >= possible * 0.4 ? "partial" : "needs-work"),
                feedback: ev.feedback || "Evaluated response.",
                strengths: Array.isArray(ev.strengths) ? ev.strengths : [],
                improvements: Array.isArray(ev.improvements) ? ev.improvements : [],
              })
            }
          })
        }
      }
    } catch (err) {
      console.error("[AI Evaluation] Non-MCQ evaluation error, applying fallback:", err)
    }

    // Fallback evaluation for any non-MCQ question missed by AI
    nonMcqQuestions.forEach((q) => {
      if (!questionEvaluations.some((ev) => ev.questionId === q.id)) {
        const studentAns = answerMap.get(q.id)
        const hasContent = Boolean(studentAns?.answerText && studentAns.answerText.trim().length > 10)
        const possible = q.points || (q.type === "CODE" ? 15 : 10)
        const earned = hasContent ? Math.round(possible * 0.6) : 0
        questionEvaluations.push({
          questionId: q.id,
          type: q.type,
          pointsPossible: possible,
          pointsEarned: earned,
          verdict: hasContent ? "partial" : "needs-work",
          feedback: hasContent ? "Answer submitted, basic technical review applied." : "No answer submitted.",
          strengths: hasContent ? ["Submitted solution attempt"] : [],
          improvements: hasContent ? ["Expand on implementation depth"] : ["No answer submitted"],
        })
      }
    })
  }

  // 3. Compute Section and Total Scores
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

    if (q.type === "MCQ") {
      // handled in totalMcq
    } else if (q.type === "CODE") {
      codingPossible += possible
      codingEarned += earned
    } else {
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
