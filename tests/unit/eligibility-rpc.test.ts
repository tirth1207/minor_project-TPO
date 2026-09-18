import { describe, it, expect } from "vitest"
import { checkStudentEligibility } from "../../src/lib/eligibility/check-student-eligibility"

describe("Eligibility Helper", () => {
  it("should throw error if studentId or jobId is missing", async () => {
    const mockSupabase = {}
    await expect(checkStudentEligibility(mockSupabase, "", "job-1")).rejects.toThrow(
      "studentId and jobId are required"
    )
    await expect(checkStudentEligibility(mockSupabase, "student-1", "")).rejects.toThrow(
      "studentId and jobId are required"
    )
  })

  it("should return boolean true when student meets all requirements", async () => {
    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: "map-1", local_status: "APPROVED" },
                  error: null,
                }),
              }),
              maybeSingle: async () => ({
                data: table === "student_profiles"
                  ? { id: "s-1", cgpa: 8.0, active_backlogs: 0, branch: "CS", skills: ["js"], profile_status: "APPROVED", is_placed: false }
                  : { id: "j-1", min_cgpa: 7.0, max_backlogs: 0, skills: ["js"], global_status: "APPROVED" },
                error: null,
              }),
            }),
            maybeSingle: async () => ({
              data: table === "student_profiles"
                ? { id: "s-1", cgpa: 8.0, active_backlogs: 0, branch: "CS", skills: ["js"], profile_status: "APPROVED", is_placed: false }
                : { id: "j-1", min_cgpa: 7.0, max_backlogs: 0, skills: ["js"], global_status: "APPROVED" },
              error: null,
            }),
            then: (resolve: any) => resolve({ data: [{ branch_name: "CS" }], error: null }),
          }),
        }),
      }),
    }

    const isEligible = await checkStudentEligibility(mockSupabase, "student-100", "job-200")
    expect(isEligible).toBe(true)
  })

  it("should throw error when database fetch fails", async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "DB Error" } }),
            then: (resolve: any) => resolve({ data: null, error: { message: "DB Error" } }),
          }),
        }),
      }),
    }

    await expect(
      checkStudentEligibility(mockSupabase, "student-100", "job-200")
    ).rejects.toThrow("Unable to load student eligibility data")
  })
})
