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

  it("should enforce pass score threshold boundary conditions (exact pass vs just below)", async () => {
    const answers: StudentAnswer[] = [
      { questionId: "q1", selectedOptionId: "opt1" }, // 10/10 correct -> 50% score
      { questionId: "q2", selectedOptionId: "opt1" }, // 0/10 wrong
    ]

    // Exact threshold match (50% score with threshold 50%) -> passed: true
    const resultExact = await evaluateStructuredMockInterview(mcqQuestions, answers, 50)
    expect(resultExact.overallScore).toBe(50)
    expect(resultExact.passed).toBe(true)

    // Just below threshold (50% score with threshold 51%) -> passed: false
    const resultBelow = await evaluateStructuredMockInterview(mcqQuestions, answers, 51)
    expect(resultBelow.overallScore).toBe(50)
    expect(resultBelow.passed).toBe(false)
  })

  it("should calculate skill score breakdown for multiple skills", async () => {
    const multiSkillQuestions: MockInterviewQuestion[] = [
      { ...mcqQuestions[0], id: "ms1", skill: "React", points: 10, correctOptionId: "opt1" },
      { ...mcqQuestions[1], id: "ms2", skill: "React", points: 10, correctOptionId: "opt2" },
      { ...mcqQuestions[0], id: "ms3", skill: "Node.js", points: 10, correctOptionId: "opt1" },
    ]

    const answers: StudentAnswer[] = [
      { questionId: "ms1", selectedOptionId: "opt1" }, // correct React (10)
      { questionId: "ms2", selectedOptionId: "opt1" }, // wrong React (0) -> React skill 50%
      { questionId: "ms3", selectedOptionId: "opt1" }, // correct Node.js (10) -> Node.js skill 100%
    ]

    const result = await evaluateStructuredMockInterview(multiSkillQuestions, answers, 60)
    expect(result.overallScore).toBe(67) // 20 / 30 = 66.67% -> 67%
    expect(result.skillScores["React"]).toBe(50)
    expect(result.skillScores["Node.js"]).toBe(100)
    expect(result.strengths).toContain("Understands React")
    expect(result.strengths).toContain("Understands Node.js")
    expect(result.improvements).toContain("Needs to revise React")
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
