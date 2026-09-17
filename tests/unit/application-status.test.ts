import { describe, it, expect } from "vitest"
import { canTransitionApplication, isApplicationStatus, type ApplicationStatus } from "../../src/lib/applications/status"

describe("Application State Machine & Status Helpers", () => {
  describe("canTransitionApplication", () => {
    it("should allow valid APPLIED transitions", () => {
      expect(canTransitionApplication("APPLIED", "SHORTLISTED")).toBe(true)
      expect(canTransitionApplication("APPLIED", "REJECTED")).toBe(true)
      expect(canTransitionApplication("APPLIED", "WITHDRAWN")).toBe(true)
    })

    it("should reject invalid APPLIED transitions", () => {
      expect(canTransitionApplication("APPLIED", "OFFERED")).toBe(false)
      expect(canTransitionApplication("APPLIED", "APPLIED")).toBe(false)
    })

    it("should allow valid SHORTLISTED transitions", () => {
      expect(canTransitionApplication("SHORTLISTED", "OFFERED")).toBe(true)
      expect(canTransitionApplication("SHORTLISTED", "REJECTED")).toBe(true)
    })

    it("should reject invalid SHORTLISTED transitions and self-transitions", () => {
      expect(canTransitionApplication("SHORTLISTED", "APPLIED")).toBe(false)
      expect(canTransitionApplication("SHORTLISTED", "WITHDRAWN")).toBe(false)
      expect(canTransitionApplication("SHORTLISTED", "SHORTLISTED")).toBe(false)
    })

    it("should reject self-transitions for all application statuses", () => {
      const statuses: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "OFFERED", "REJECTED", "WITHDRAWN"]
      for (const status of statuses) {
        expect(canTransitionApplication(status, status)).toBe(false)
      }
    })

    it("should treat OFFERED, REJECTED, and WITHDRAWN as terminal states", () => {
      const statuses: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "OFFERED", "REJECTED", "WITHDRAWN"]
      for (const next of statuses) {
        expect(canTransitionApplication("OFFERED", next)).toBe(false)
        expect(canTransitionApplication("REJECTED", next)).toBe(false)
        expect(canTransitionApplication("WITHDRAWN", next)).toBe(false)
      }
    })

    it("should return false for unknown or invalid runtime status strings", () => {
      expect(canTransitionApplication("UNKNOWN" as any, "SHORTLISTED")).toBe(false)
      expect(canTransitionApplication("APPLIED", "INVALID" as any)).toBe(false)
    })
  })

  describe("isApplicationStatus", () => {
    it("should return true for valid application status strings", () => {
      expect(isApplicationStatus("APPLIED")).toBe(true)
      expect(isApplicationStatus("WITHDRAWN")).toBe(true)
      expect(isApplicationStatus("SHORTLISTED")).toBe(true)
      expect(isApplicationStatus("REJECTED")).toBe(true)
      expect(isApplicationStatus("OFFERED")).toBe(true)
    })

    it("should return false for invalid strings, numbers, null, and objects", () => {
      expect(isApplicationStatus("PENDING")).toBe(false)
      expect(isApplicationStatus("ACCEPTED")).toBe(false)
      expect(isApplicationStatus("applied")).toBe(false)
      expect(isApplicationStatus(123)).toBe(false)
      expect(isApplicationStatus(null)).toBe(false)
      expect(isApplicationStatus(undefined)).toBe(false)
      expect(isApplicationStatus({})).toBe(false)
    })
  })
})
