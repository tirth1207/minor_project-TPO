/**
 * Utility to safely extract and parse JSON from AI completion responses.
 * Handles markdown code fences (```json ... ```), extra text wrappers,
 * unescaped quotes, trailing commas, and malformed strings.
 */

export function cleanAndParseJson<T = any>(rawInput: string): T {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("Empty or non-string input provided for JSON parsing");
  }

  let cleaned = rawInput.trim();

  // Strip markdown code fences if present at the start/end
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Find first { or [ and last } or ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIndex = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex !== -1) {
    const lastIndex = isObject ? cleaned.lastIndexOf("}") : cleaned.lastIndexOf("]");
    if (lastIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, lastIndex + 1);
    }
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt cleanup for common JSON flaws (e.g., trailing commas, unescaped control chars)
    const sanitized = cleaned
      .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
        if (match === "\n") return "\\n";
        if (match === "\r") return "\\r";
        if (match === "\t") return "\\t";
        return "";
      });

    try {
      return JSON.parse(sanitized);
    } catch (secondErr: any) {
      console.error("[JSON Parser] Failed to parse AI output:", {
        rawInput: rawInput.slice(0, 200),
        cleaned: cleaned.slice(0, 200),
        error: secondErr?.message,
      });
      throw new Error(`Malformed AI JSON response: ${secondErr?.message || "Invalid JSON"}`);
    }
  }
}
