import { describe, it, expect } from "vitest"

export type MockStatus = "QUEUED" | "REQUESTED" | "PROCESSING" | "ANSWERING" | "EVALUATING" | "EVALUATED" | "FAILED"

export function canAcquireProcessingLock(
  currentStatus: MockStatus,
  updatedAtIso: string,
  nowMs: number = Date.now()
): boolean {
  if (["QUEUED", "REQUESTED", "FAILED"].includes(currentStatus)) {
    return true
  }

  if (currentStatus === "PROCESSING") {
    const lastUpdateMs = new Date(updatedAtIso).getTime()
    const staleThresholdMs = 2 * 60 * 1000 // 2 minutes
    return nowMs - lastUpdateMs > staleThresholdMs
  }

  return false
}

export function validateQuestionCount(questions: any[]): boolean {
  if (!Array.isArray(questions)) return false
  return questions.length >= 3
}

export function handleAnswerSubmission(
  mock: { id: string; student_id: string; status: MockStatus; answers?: any[] },
  requestStudentId: string,
  newAnswers: any[]
) {
  if (mock.student_id !== requestStudentId) {
    return { success: false, code: "FORBIDDEN", error: "Unauthorized access to mock interview" }
  }

  if (mock.status === "EVALUATED") {
    return { success: false, code: "ALREADY_EVALUATED", error: "Mock interview has already been evaluated" }
  }

  // Preserve answers step
  const updatedMock = {
    ...mock,
    answers: newAnswers,
    status: "EVALUATING" as MockStatus,
  }

  return { success: true, updatedMock }
}

describe("Mock Interview State Machine & Security", () => {
  it("should acquire processing lock for QUEUED, REQUESTED, or FAILED sessions", () => {
    const now = Date.now()
    const recentIso = new Date(now).toISOString()

    expect(canAcquireProcessingLock("QUEUED", recentIso, now)).toBe(true)
    expect(canAcquireProcessingLock("REQUESTED", recentIso, now)).toBe(true)
    expect(canAcquireProcessingLock("FAILED", recentIso, now)).toBe(true)
  })

  it("should block concurrent lock acquisition for active PROCESSING session under 2 minutes", () => {
    const now = Date.now()
    const recentIso = new Date(now - 30 * 1000).toISOString() // 30s ago

    expect(canAcquireProcessingLock("PROCESSING", recentIso, now)).toBe(false)
  })

  it("should recover stale PROCESSING session older than 2 minutes", () => {
    const now = Date.now()
    const staleIso = new Date(now - 3 * 60 * 1000).toISOString() // 3 minutes ago

    expect(canAcquireProcessingLock("PROCESSING", staleIso, now)).toBe(true)
  })

  it("should reject mock question list with fewer than 3 questions", () => {
    expect(validateQuestionCount([])).toBe(false)
    expect(validateQuestionCount([{ id: "q1" }, { id: "q2" }])).toBe(false)
    expect(validateQuestionCount([{ id: "q1" }, { id: "q2" }, { id: "q3" }])).toBe(true)
  })

  it("should enforce student ownership check on answer submission", () => {
    const mock = { id: "m1", student_id: "student-A", status: "ANSWERING" as MockStatus }
    const res = handleAnswerSubmission(mock, "student-B", [{ questionId: "q1", answerText: "ans" }])

    expect(res.success).toBe(false)
    expect(res.code).toBe("FORBIDDEN")
  })

  it("should reject submission if interview is already EVALUATED", () => {
    const mock = { id: "m1", student_id: "student-A", status: "EVALUATED" as MockStatus }
    const res = handleAnswerSubmission(mock, "student-A", [{ questionId: "q1" }])

    expect(res.success).toBe(false)
    expect(res.code).toBe("ALREADY_EVALUATED")
  })

  it("should persist candidate answers when submission begins", () => {
    const mock = { id: "m1", student_id: "student-A", status: "ANSWERING" as MockStatus }
    const candidateAnswers = [{ questionId: "q1", selectedOptionId: "opt1" }]
    const res = handleAnswerSubmission(mock, "student-A", candidateAnswers)

    expect(res.success).toBe(true)
    expect(res.updatedMock?.answers).toEqual(candidateAnswers)
    expect(res.updatedMock?.status).toBe("EVALUATING")
  })
})
