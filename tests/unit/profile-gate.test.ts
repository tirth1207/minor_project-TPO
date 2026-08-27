import { describe, it, expect } from "vitest"

export function evaluateProfileUpdateTrigger(
  oldProfile: { name: string; cgpa: number; resume_url: string; profile_status: string },
  newProfile: { name: string; cgpa: number; resume_url: string; profile_status: string }
) {
  const isCriticalChange =
    oldProfile.name !== newProfile.name ||
    oldProfile.cgpa !== newProfile.cgpa ||
    oldProfile.resume_url !== newProfile.resume_url

  if (isCriticalChange) {
    return { ...newProfile, profile_status: "PENDING" }
  }

  return newProfile
}

describe("Profile Status Gate Trigger", () => {
  const approvedProfile = {
    name: "John Doe",
    cgpa: 8.5,
    resume_url: "https://example.com/resume1.pdf",
    profile_status: "APPROVED"
  }

  it("should revert profile status to PENDING when CGPA changes", () => {
    const updated = { ...approvedProfile, cgpa: 8.8 }
    const result = evaluateProfileUpdateTrigger(approvedProfile, updated)
    expect(result.profile_status).toBe("PENDING")
  })

  it("should revert profile status to PENDING when name changes", () => {
    const updated = { ...approvedProfile, name: "Johnathan Doe" }
    const result = evaluateProfileUpdateTrigger(approvedProfile, updated)
    expect(result.profile_status).toBe("PENDING")
  })

  it("should revert profile status to PENDING when resume URL changes", () => {
    const updated = { ...approvedProfile, resume_url: "https://example.com/resume2.pdf" }
    const result = evaluateProfileUpdateTrigger(approvedProfile, updated)
    expect(result.profile_status).toBe("PENDING")
  })

  it("should keep APPROVED status when non-critical fields change", () => {
    const updated = { ...approvedProfile }
    const result = evaluateProfileUpdateTrigger(approvedProfile, updated)
    expect(result.profile_status).toBe("APPROVED")
  })
})
