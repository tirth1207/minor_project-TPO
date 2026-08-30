/**
 * Utility to safely extract and parse JSON from AI completion responses.
 *
 * Handles:
 * - Markdown code fences
 * - Extra text before/after JSON
 * - Trailing commas
 * - Invalid control characters
 * - JSON objects
 * - JSON arrays
 *
 * IMPORTANT:
 * This parser does NOT attempt to magically repair truncated JSON.
 *
 * Truncated JSON should be handled by the NVIDIA wrapper by detecting
 * finish_reason === "length" and retrying with a larger token budget.
 */

export function cleanAndParseJson<T = any>(
  rawInput: string
): T {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error(
      "Empty or non-string input provided for JSON parsing"
    );
  }

  let cleaned = rawInput.trim();

  if (!cleaned) {
    throw new Error(
      "Empty AI response provided for JSON parsing"
    );
  }

  /**
   * Remove markdown code fences.
   *
   * Supports:
   *
   * ```json
   * {...}
   * ```
   *
   * and:
   *
   * ```
   * {...}
   * ```
   */
  cleaned = cleaned
    .replace(/^```(?:json|JSON)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  /**
   * First try the response exactly as received.
   */
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue with extraction/sanitization.
  }

  /**
   * Find the beginning of either an object or array.
   */
  const firstObject = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");

  let startIndex = -1;

  if (
    firstObject !== -1 &&
    firstArray !== -1
  ) {
    startIndex = Math.min(
      firstObject,
      firstArray
    );
  } else if (firstObject !== -1) {
    startIndex = firstObject;
  } else if (firstArray !== -1) {
    startIndex = firstArray;
  }

  if (startIndex === -1) {
    throw new Error(
      "No JSON object or array found in AI response"
    );
  }

  /**
   * Determine whether the JSON starts with an object or array.
   */
  const startsWithObject =
    cleaned[startIndex] === "{";

  const closingCharacter =
    startsWithObject ? "}" : "]";

  /**
   * Find the last closing character.
   *
   * This is intentionally simple because the direct JSON.parse()
   * attempt above already handles normal JSON.
   */
  const endIndex =
    cleaned.lastIndexOf(closingCharacter);

  if (
    endIndex === -1 ||
    endIndex <= startIndex
  ) {
    throw new Error(
      "AI response contains incomplete JSON"
    );
  }

  cleaned = cleaned
    .slice(startIndex, endIndex + 1)
    .trim();

  /**
   * Remove trailing commas.
   *
   * Example:
   *
   * {
   *   "name": "Tirth",
   * }
   *
   * becomes:
   *
   * {
   *   "name": "Tirth"
   * }
   */
  const sanitized = cleaned
    .replace(
      /,\s*([}\]])/g,
      "$1"
    )

    /**
     * Remove invalid control characters.
     *
     * Preserve normal whitespace such as:
     * \n
     * \r
     * \t
     */
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,
      ""
    );

  /**
   * Try sanitized JSON.
   */
  try {
    return JSON.parse(sanitized) as T;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid JSON";

    /**
     * Give a useful diagnostic without logging the entire AI response.
     */
    console.error(
      "[JSON Parser] Failed to parse AI output:",
      {
        originalLength: rawInput.length,
        cleanedLength: cleaned.length,
        preview: sanitized.slice(0, 500),
        error: message,
      }
    );

    throw new Error(
      `Malformed AI JSON response: ${message}`
    );
  }
}