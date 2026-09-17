import { describe, it, expect, vi } from "vitest"
import { checkStudentEligibility } from "../../src/lib/eligibility/check-student-eligibility"

describe("Eligibility RPC Database Helper", () => {
  it("should throw error if studentId or jobId is missing", async () => {
    const mockSupabase = {}
    await expect(checkStudentEligibility(mockSupabase, "", "job-1")).rejects.toThrow(
      "studentId and jobId are required"
    )
    await expect(checkStudentEligibility(mockSupabase, "student-1", "")).rejects.toThrow(
      "studentId and jobId are required"
    )
  })

  it("should return true when RPC returns strict boolean true", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null })
    const mockSupabase = { rpc: mockRpc }

    const isEligible = await checkStudentEligibility(mockSupabase, "student-100", "job-200")

    expect(isEligible).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith("check_student_eligibility", {
      p_student_id: "student-100",
      p_job_id: "job-200",
    })
  })

  it("should return false when RPC returns false or non-strict-boolean truthy values", async () => {
    const mockRpcFalse = vi.fn().mockResolvedValue({ data: false, error: null })
    expect(await checkStudentEligibility({ rpc: mockRpcFalse }, "student-100", "job-200")).toBe(false)

    const mockRpcString = vi.fn().mockResolvedValue({ data: "true", error: null })
    expect(await checkStudentEligibility({ rpc: mockRpcString }, "student-100", "job-200")).toBe(false)

    const mockRpcNull = vi.fn().mockResolvedValue({ data: null, error: null })
    expect(await checkStudentEligibility({ rpc: mockRpcNull }, "student-100", "job-200")).toBe(false)
  })

  it("should throw descriptive error when database RPC returns error", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: "DB Connection Failed" } })
    const mockSupabase = { rpc: mockRpc }

    await expect(
      checkStudentEligibility(mockSupabase, "student-100", "job-200")
    ).rejects.toThrow("Unable to verify job eligibility")
  })
})
