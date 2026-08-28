import { describe, it, expect } from "vitest"
import { cleanAndParseJson } from "../../src/lib/ai/json-parser"

describe("AI Response JSON Parser Utility", () => {
  it("should parse clean JSON directly", () => {
    const raw = `{"careerGoal":{"dreamJob":"Software Engineer"}}`
    const parsed = cleanAndParseJson(raw)
    expect(parsed.careerGoal.dreamJob).toBe("Software Engineer")
  })

  it("should strip markdown code fences (```json ... ```)", () => {
    const raw = "```json\n{\n  \"readiness\": {\"score\": 85}\n}\n```"
    const parsed = cleanAndParseJson(raw)
    expect(parsed.readiness.score).toBe(85)
  })

  it("should strip text surrounding JSON object", () => {
    const raw = "Here is your generated response:\n{\"status\":\"SUCCESS\"}\nHope this helps!"
    const parsed = cleanAndParseJson(raw)
    expect(parsed.status).toBe("SUCCESS")
  })

  it("should handle trailing commas gracefully", () => {
    const raw = `{"skills": ["React", "TypeScript",], "score": 90,}`
    const parsed = cleanAndParseJson(raw)
    expect(parsed.skills).toHaveLength(2)
    expect(parsed.score).toBe(90)
  })

  it("should throw a descriptive error on completely malformed JSON", () => {
    const raw = "Not a JSON at all {"
    expect(() => cleanAndParseJson(raw)).toThrow(/Malformed AI JSON response/)
  })
})
