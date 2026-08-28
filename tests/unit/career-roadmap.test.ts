import { describe, it, expect } from "vitest"
import { generateProfileHash, generateJobsHash } from "../../src/lib/ai/career-roadmap"

describe("Career Roadmap Hashing and Invalidation Logic", () => {
  const sampleProfile1 = {
    dream_job: "Software Engineering",
    dream_role: "Backend Engineer",
    dream_ctc: 12,
    current_skills: ["Node.js", "Express"],
    dream_skills: ["PostgreSQL", "Docker"],
    skill_level: "Intermediate",
    target_timeline: "3 months",
  }

  const sampleProfile2 = {
    ...sampleProfile1,
    dream_role: "Frontend Engineer", // profile change
  }

  const sampleJobs1 = [
    {
      job: { id: "job-1", title: "Backend Developer", ctc_max: 10, global_status: "APPROVED" },
      mapping: { id: "map-1" },
    },
  ]

  const sampleJobs2 = [
    ...sampleJobs1,
    {
      job: { id: "job-2", title: "DevOps Engineer", ctc_max: 14, global_status: "APPROVED" },
      mapping: { id: "map-2" },
    },
  ]

  it("should generate deterministic profile hashes", () => {
    const hashA = generateProfileHash(sampleProfile1)
    const hashB = generateProfileHash(sampleProfile1)
    expect(hashA).toBe(hashB)
    expect(hashA).toHaveLength(64)
  })

  it("should invalidate profile hash when profile changes", () => {
    const hash1 = generateProfileHash(sampleProfile1)
    const hash2 = generateProfileHash(sampleProfile2)
    expect(hash1).not.toBe(hash2)
  })

  it("should generate deterministic jobs hashes", () => {
    const hashA = generateJobsHash(sampleJobs1)
    const hashB = generateJobsHash(sampleJobs1)
    expect(hashA).toBe(hashB)
  })

  it("should invalidate jobs hash when available jobs change", () => {
    const hash1 = generateJobsHash(sampleJobs1)
    const hash2 = generateJobsHash(sampleJobs2)
    expect(hash1).not.toBe(hash2)
  })

  it("should return stable string for zero-job scenario", () => {
    const hashEmpty = generateJobsHash([])
    expect(hashEmpty).toBe("no-approved-jobs")
  })
})
