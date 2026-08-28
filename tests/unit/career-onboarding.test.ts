import { describe, it, expect } from "vitest"

export function validateOnboardingStep(
  step: number,
  data: {
    dreamJob?: string
    dreamRole?: string
    currentSkills?: string[]
    dreamSkills?: string[]
  }
) {
  const errors: Record<string, string> = {}

  if (step === 1) {
    if (!data.dreamJob || !data.dreamJob.trim()) {
      errors.dreamJob = "Dream job domain is required"
    }
    if (!data.dreamRole || !data.dreamRole.trim()) {
      errors.dreamRole = "Target role is required"
    }
  }

  if (step === 2) {
    if (!data.currentSkills || data.currentSkills.length === 0) {
      errors.currentSkills = "At least one current skill is required"
    }
    if (!data.dreamSkills || data.dreamSkills.length === 0) {
      errors.dreamSkills = "At least one target skill is required"
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

describe("Career Onboarding Form Validation", () => {
  it("should fail validation if Step 1 required fields are missing", () => {
    const res = validateOnboardingStep(1, { dreamJob: "", dreamRole: "" })
    expect(res.valid).toBe(false)
    expect(res.errors.dreamJob).toBeDefined()
    expect(res.errors.dreamRole).toBeDefined()
  })

  it("should pass validation when Step 1 required fields are present", () => {
    const res = validateOnboardingStep(1, {
      dreamJob: "Software Engineering",
      dreamRole: "Full Stack Developer",
    })
    expect(res.valid).toBe(true)
  })

  it("should fail validation if Step 2 skills arrays are empty", () => {
    const res = validateOnboardingStep(2, { currentSkills: [], dreamSkills: [] })
    expect(res.valid).toBe(false)
    expect(res.errors.currentSkills).toBeDefined()
    expect(res.errors.dreamSkills).toBeDefined()
  })

  it("should pass validation when Step 2 skills are provided", () => {
    const res = validateOnboardingStep(2, {
      currentSkills: ["React", "JavaScript"],
      dreamSkills: ["System Design", "Kubernetes"],
    })
    expect(res.valid).toBe(true)
  })
})
