import { describe, it, expect } from "vitest"
import {
  getStudentEligibility,
  checkStudentEligibility,
  normalizeSkill,
  normalizeSkills,
  displaySkill,
} from "../../src/lib/eligibility/check-student-eligibility"

describe("Skill Normalization & Aliases", () => {
  it("normalizes skill names and aliases correctly", () => {
    expect(normalizeSkill("React.js")).toBe("reactjs")
    expect(normalizeSkill("React JS")).toBe("reactjs")
    expect(normalizeSkill("Node.js")).toBe("nodejs")
    expect(normalizeSkill("Node JS")).toBe("nodejs")
    expect(normalizeSkill("C++")).toBe("cpp")
    expect(normalizeSkill("C plus plus")).toBe("cpp")
    expect(normalizeSkill("C#")).toBe("csharp")
    expect(normalizeSkill("C sharp")).toBe("csharp")
    expect(normalizeSkill("C")).toBe("c")
    expect(normalizeSkill("PostgreSQL")).toBe("postgres")
    expect(normalizeSkill("Postgre SQL")).toBe("postgres")
  })

  it("ensures C, C++, C# remain distinct", () => {
    const c = normalizeSkill("C")
    const cpp = normalizeSkill("C++")
    const csharp = normalizeSkill("C#")

    expect(c).not.toBe(cpp)
    expect(c).not.toBe(csharp)
    expect(cpp).not.toBe(csharp)
  })

  it("normalizes and deduplicates skill arrays", () => {
    const skills = normalizeSkills(["React.js", "react js", " Node.js ", "C++", "cpp"])
    expect(skills).toEqual(["reactjs", "nodejs", "cpp"])
  })

  it("displays human-readable skill names", () => {
    expect(displaySkill("cpp")).toBe("C++")
    expect(displaySkill("csharp")).toBe("C#")
    expect(displaySkill("reactjs")).toBe("React.js")
    expect(displaySkill("postgres")).toBe("PostgreSQL")
  })
})

describe("Single Source of Truth Student Eligibility Engine", () => {
  function createMockSupabase(overrides: {
    student?: any
    job?: any
    branches?: any[]
    mapping?: any
  } = {}) {
    const defaultStudent = {
      id: "student-1",
      cgpa: 8.5,
      active_backlogs: 0,
      branch: "Computer Engineering",
      skills: ["React.js", "Node.js", "PostgreSQL"],
      profile_status: "APPROVED",
      is_placed: false,
      user_id: "user-1",
      users: { org_id: "org-1" },
    }

    const defaultJob = {
      id: "job-1",
      min_cgpa: 7.5,
      max_backlogs: 0,
      skills: ["reactjs", "Node JS"],
      global_status: "APPROVED",
    }

    const defaultBranches = [{ branch_name: "Computer Engineering" }]
    const defaultMapping = { id: "map-1", org_id: "org-1", local_status: "APPROVED" }

    const studentData = overrides.student !== undefined ? overrides.student : defaultStudent
    const jobData = overrides.job !== undefined ? overrides.job : defaultJob
    const branchesData = overrides.branches !== undefined ? overrides.branches : defaultBranches
    const mappingData = overrides.mapping !== undefined ? overrides.mapping : defaultMapping

    return {
      from: (table: string) => {
        return {
          select: () => {
            return {
              eq: (field: string, val: any) => {
                return {
                  eq: (field2: string, val2: any) => {
                    return {
                      eq: (field3: string, val3: any) => {
                        return {
                          maybeSingle: async () => ({
                            data: table === "job_college_mappings" ? mappingData : null,
                            error: null,
                          }),
                        }
                      },
                      maybeSingle: async () => ({
                        data: table === "job_college_mappings" ? mappingData : null,
                        error: null,
                      }),
                    }
                  },
                  maybeSingle: async () => ({
                    data: table === "student_profiles" ? studentData : table === "job_postings" ? jobData : null,
                    error: null,
                  }),
                  then: (resolve: any) => {
                    if (table === "job_eligible_branches") {
                      resolve({ data: branchesData, error: null })
                    } else {
                      resolve({ data: null, error: null })
                    }
                  },
                }
              },
            }
          },
        }
      },
    }
  }

  it("PASS: approves fully eligible student with alias skills", async () => {
    const supabase = createMockSupabase()
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")

    expect(result.eligible).toBe(true)
    expect(result.failedRequirements).toHaveLength(0)
    expect(result.reasons.skills).toBe(true)
  })

  it("FAIL: profile pending", async () => {
    const supabase = createMockSupabase({
      student: {
        id: "student-1",
        cgpa: 8.5,
        active_backlogs: 0,
        branch: "Computer Engineering",
        skills: ["React.js", "Node.js"],
        profile_status: "PENDING",
        is_placed: false,
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.profileApproved).toBe(false)
  })

  it("FAIL: already placed", async () => {
    const supabase = createMockSupabase({
      student: {
        id: "student-1",
        cgpa: 8.5,
        active_backlogs: 0,
        branch: "Computer Engineering",
        skills: ["React.js", "Node.js"],
        profile_status: "APPROVED",
        is_placed: true,
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.notPlaced).toBe(false)
  })

  it("FAIL: low CGPA", async () => {
    const supabase = createMockSupabase({
      student: {
        id: "student-1",
        cgpa: 6.5,
        active_backlogs: 0,
        branch: "Computer Engineering",
        skills: ["React.js", "Node.js"],
        profile_status: "APPROVED",
        is_placed: false,
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.cgpa).toBe(false)
  })

  it("FAIL: too many backlogs", async () => {
    const supabase = createMockSupabase({
      student: {
        id: "student-1",
        cgpa: 8.5,
        active_backlogs: 2,
        branch: "Computer Engineering",
        skills: ["React.js", "Node.js"],
        profile_status: "APPROVED",
        is_placed: false,
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.backlogs).toBe(false)
  })

  it("FAIL: wrong branch", async () => {
    const supabase = createMockSupabase({
      student: {
        id: "student-1",
        cgpa: 8.5,
        active_backlogs: 0,
        branch: "Mechanical Engineering",
        skills: ["React.js", "Node.js"],
        profile_status: "APPROVED",
        is_placed: false,
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.branch).toBe(false)
  })

  it("FAIL: missing required skills", async () => {
    const supabase = createMockSupabase({
      job: {
        id: "job-1",
        min_cgpa: 7.5,
        max_backlogs: 0,
        skills: ["React.js", "Python"],
        global_status: "APPROVED",
      },
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.skills).toBe(false)
    expect(result.missingSkills).toContain("Python")
  })

  it("FAIL: college mapping not approved", async () => {
    const supabase = createMockSupabase({
      mapping: null,
    })
    const result = await getStudentEligibility(supabase, "student-1", "job-1", "org-1")
    expect(result.eligible).toBe(false)
    expect(result.reasons.collegeMapping).toBe(false)
  })
})
