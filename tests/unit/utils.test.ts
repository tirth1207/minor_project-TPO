import { describe, it, expect } from "vitest"
import { cn } from "../../src/lib/utils"

describe("Class Name Utility (cn)", () => {
  it("should merge simple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("should handle conditional class maps and arrays", () => {
    expect(cn("px-2", true && "text-red-500", false && "bg-blue-500", ["rounded", { "font-bold": true }])).toBe(
      "px-2 text-red-500 rounded font-bold"
    )
  })

  it("should resolve conflicting Tailwind utility classes", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4")
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("should handle null, undefined, and empty string arguments gracefully", () => {
    expect(cn("px-2", null, undefined, "", "py-1")).toBe("px-2 py-1")
  })
})
