import { describe, it, expect } from "vitest"
import { evaluateStructuredMockInterview } from "../../src/lib/ai/mock-interview-evaluator"
import type { MockInterviewQuestion, StudentAnswer } from "../../src/types/mock-interview"

describe("Mock Interview Evaluator", () => {
  const mcqQuestions: MockInterviewQuestion[] = [
    {
      id: "q1",
      type: "MCQ",
      question: "What is the Big O time complexity of accessing an array element by index?",
      options: [
        { id: "opt1", text: "O(1)" },
        { id: "opt2", text: "O(n)" },
        { id: "opt3", text: "O(log n)" },
      ],
      correctOptionId: "opt1",
      explanation: "Direct index access in arrays is continuous memory lookup O(1).",
      difficulty: "EASY",
      skill: "Data Structures",
      points: 10,
    },
    {
      id: "q2",
      type: "MCQ",
      question: "Which SQL clause filters groups after aggregation?",
      options: [
        { id: "opt1", text: "WHERE" },
        { id: "opt2", text: "HAVING" },
        { id: "opt3", text: "GROUP BY" },
      ],
      correctOptionId: "opt2",
      explanation: "HAVING filters aggregated groups.",
      difficulty: "EASY",
      skill: "Databases",
      points: 10,
    },
  ]

  it("should evaluate a 100% correct MCQ assessment as passed", async () => {
    const answers: StudentAnswer[] = [
      { questionId: "q1", selectedOptionId: "opt1" },
      { questionId: "q2", selectedOptionId: "opt2" },
    ]

    const result = await evaluateStructuredMockInterview(mcqQuestions, answers, 70)

    expect(result.overallScore).toBe(100)
    expect(result.mcqScore).toBe(100)
    expect(result.passed).toBe(true)
    expect(result.skillScores["Data Structures"]).toBe(100)
    expect(result.skillScores["Databases"]).toBe(100)
    expect(result.summary).toContain("Strong performance!")
    expect(result.questionEvaluations).toHaveLength(2)
    expect(result.questionEvaluations[0].isCorrect).toBe(true)
    expect(result.questionEvaluations[1].isCorrect).toBe(true)
  })

  it("should evaluate an incorrect or partially incorrect MCQ assessment as failed if below threshold", async () => {
    const answers: StudentAnswer[] = [
      { questionId: "q1", selectedOptionId: "opt2" }, // wrong
      { questionId: "q2", selectedOptionId: "opt3" }, // wrong
    ]

    const result = await evaluateStructuredMockInterview(mcqQuestions, answers, 70)

    expect(result.overallScore).toBe(0)
    expect(result.mcqScore).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.summary).toContain("below the passing threshold")
    expect(result.questionEvaluations[0].isCorrect).toBe(false)
    expect(result.questionEvaluations[1].isCorrect).toBe(false)
  })

  it("should enforce pass score threshold correctly for partial scores", async () => {
    const answers: StudentAnswer[] = [
      { questionId: "q1", selectedOptionId: "opt1" }, // correct (10/10)
      { questionId: "q2", selectedOptionId: "opt1" }, // wrong (0/10) -> 50% overall
    ]

    const resultLowPass = await evaluateStructuredMockInterview(mcqQuestions, answers, 50)
    expect(resultLowPass.overallScore).toBe(50)
    expect(resultLowPass.passed).toBe(true)

    const resultHighPass = await evaluateStructuredMockInterview(mcqQuestions, answers, 70)
    expect(resultHighPass.overallScore).toBe(50)
    expect(resultHighPass.passed).toBe(false)
  })

  it("should handle unanswered MCQ questions gracefully as 0 points", async () => {
    const answers: StudentAnswer[] = [] // no answers provided

    const result = await evaluateStructuredMockInterview(mcqQuestions, answers, 70)

    expect(result.overallScore).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.questionEvaluations[0].isCorrect).toBe(false)
    expect(result.questionEvaluations[1].isCorrect).toBe(false)
  })
})
