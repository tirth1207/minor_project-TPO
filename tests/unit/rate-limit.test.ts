import { describe, it, expect } from "vitest"
import { checkRateLimit } from "../../src/lib/rate-limit"

describe("Rate Limiting Utility", () => {
  it("should allow requests under the limit and block when exceeded", () => {
    const id = "test-user-123"
    const opts = { windowMs: 1000, maxRequests: 3 }

    expect(checkRateLimit(id, opts).success).toBe(true)
    expect(checkRateLimit(id, opts).success).toBe(true)
    expect(checkRateLimit(id, opts).success).toBe(true)
    expect(checkRateLimit(id, opts).success).toBe(false)
  })
})
