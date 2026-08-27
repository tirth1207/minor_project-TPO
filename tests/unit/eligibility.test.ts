import { describe, it, expect } from "vitest"

export function checkStudentEligibility(student: {
  branch: string
  cgpa: number
  active_backlogs: number
  profile_status: string
  is_placed: boolean
}, job: {
  eligible_branches: string[]
  min_cgpa: number
  max_backlogs: number
  global_status: string
}) {
  if (student.profile_status !== "APPROVED") {
    return { eligible: false, reason: "Student profile is not approved" }
  }

  if (student.is_placed) {
    return { eligible: false, reason: "Student is already placed" }
  }

  if (job.global_status !== "APPROVED") {
    return { eligible: false, reason: "Job posting is not globally approved" }
  }

  if (!job.eligible_branches.includes(student.branch)) {
    return { eligible: false, reason: "Student branch is not in job eligible branches" }
  }

  if (student.cgpa < job.min_cgpa) {
    return { eligible: false, reason: "Student CGPA is below required minimum" }
  }

  if (student.active_backlogs > job.max_backlogs) {
    return { eligible: false, reason: "Student active backlogs exceed maximum allowed" }
  }

  return { eligible: true, reason: "Eligible" }
}

describe("Job Eligibility Logic", () => {
  const defaultJob = {
    eligible_branches: ["Computer Engineering", "Information Technology"],
    min_cgpa: 7.5,
    max_backlogs: 0,
    global_status: "APPROVED"
  }

  it("should approve an eligible student", () => {
    const student = {
      branch: "Computer Engineering",
      cgpa: 8.5,
      active_backlogs: 0,
      profile_status: "APPROVED",
      is_placed: false
    }

    const res = checkStudentEligibility(student, defaultJob)
    expect(res.eligible).toBe(true)
  })

  it("should reject student if profile status is PENDING", () => {
    const student = {
      branch: "Computer Engineering",
      cgpa: 8.5,
      active_backlogs: 0,
      profile_status: "PENDING",
      is_placed: false
    }

    const res = checkStudentEligibility(student, defaultJob)
    expect(res.eligible).toBe(false)
    expect(res.reason).toContain("not approved")
  })

  it("should reject student if CGPA is below threshold", () => {
    const student = {
      branch: "Computer Engineering",
      cgpa: 7.2,
      active_backlogs: 0,
      profile_status: "APPROVED",
      is_placed: false
    }

    const res = checkStudentEligibility(student, defaultJob)
    expect(res.eligible).toBe(false)
    expect(res.reason).toContain("below required minimum")
  })

  it("should reject student if active backlogs exceed maximum", () => {
    const student = {
      branch: "Computer Engineering",
      cgpa: 8.0,
      active_backlogs: 1,
      profile_status: "APPROVED",
      is_placed: false
    }

    const res = checkStudentEligibility(student, defaultJob)
    expect(res.eligible).toBe(false)
    expect(res.reason).toContain("exceed maximum")
  })

  it("should reject student if already placed", () => {
    const student = {
      branch: "Computer Engineering",
      cgpa: 9.0,
      active_backlogs: 0,
      profile_status: "APPROVED",
      is_placed: true
    }

    const res = checkStudentEligibility(student, defaultJob)
    expect(res.eligible).toBe(false)
    expect(res.reason).toContain("already placed")
  })
})
