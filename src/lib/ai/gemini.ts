/**
 * Google Gemini fallback chat-completion wrapper.
 *
 * Server-side only. This intentionally returns an OpenAI-compatible
 * completion shape so the existing NVIDIA callers, prompts, JSON parsing,
 * Zod validation, mock interview flow, and career roadmap flow remain
 * unchanged.
 *
 * Configuration:
 * - GEMINI_API_KEY: Google AI Studio API key
 * - GEMINI_MODEL: Gemini model id (default: gemini-3.5-flash)
 */

import OpenAI from "openai"

type GeminiMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

interface GeminiApiError extends Error {
  status?: number
  code?: string
}

function normalizeGeminiError(error: unknown): GeminiApiError {
  const source = error as any
  const normalized = new Error(
    source?.message || "Gemini AI service request failed"
  ) as GeminiApiError

  normalized.name = source?.name || "GeminiError"
  normalized.status = source?.status
  normalized.code = source?.code
  return normalized
}

function extractText(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ""

  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim()
}

function toOpenAICompletion(
  model: string,
  response: any,
  durationMs: number
): OpenAI.Chat.Completions.ChatCompletion {
  const text = extractText(response)
  const finishReason = response?.candidates?.[0]?.finishReason

  return {
    id: response?.responseId || `gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: text,
          refusal: null,
        },
        logprobs: null,
        finish_reason: finishReason === "MAX_TOKENS" ? "length" : "stop",
      },
    ],
    usage: {
      prompt_tokens: response?.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: response?.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: response?.usageMetadata?.totalTokenCount ?? 0,
    },
  } as OpenAI.Chat.Completions.ChatCompletion
}

/**
 * Calls Gemini using the REST API and returns the same completion shape
 * expected by the existing NVIDIA-based application code.
 */
export async function callGeminiChat(
  messages: GeminiMessage[],
  options?: {
    model?: string
    timeoutMs?: number
    maxTokens?: number
  }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    const error = new Error(
      "GEMINI_API_KEY environment variable is missing"
    ) as GeminiApiError
    error.status = 401
    error.code = "MISSING_API_KEY"
    throw error
  }

  const model =
    options?.model ||
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash"

  const timeoutMs = Math.max(1000, options?.timeoutMs ?? 30000)
  // Gemini 3.x can spend part of the generation budget on reasoning. Keep a
  // generous output budget because callers such as mock-interview generate
  // large JSON arrays that must be returned completely.
  const maxOutputTokens = Math.max(12000, options?.maxTokens ?? 12000)

  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }))

  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: "Respond according to the supplied system instruction." }],
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction:
            systemMessages.length > 0
              ? { parts: [{ text: systemMessages.join("\n\n") }] }
              : undefined,
          contents,
          generationConfig: {
            temperature: 0.2,
            topP: 0.7,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    )

    const durationMs = Date.now() - start
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const error = new Error(
        payload?.error?.message ||
          `Gemini request failed with HTTP ${response.status}`
      ) as GeminiApiError
      error.status = response.status
      error.code = payload?.error?.status || "GEMINI_API_ERROR"
      throw error
    }

    const completion = toOpenAICompletion(model, payload, durationMs)
    const text = completion.choices?.[0]?.message?.content?.trim() || ""
    const finishReason = completion.choices?.[0]?.finish_reason

    if (!text) {
      const error = new Error("Gemini returned an empty completion") as GeminiApiError
      error.code = "EMPTY_COMPLETION"
      throw error
    }

    if (finishReason === "length") {
      const error = new Error(
        `Gemini response was truncated because maxOutputTokens (${maxOutputTokens}) was reached`
      ) as GeminiApiError
      error.code = "MAX_TOKENS_EXCEEDED"
      throw error
    }

    console.log(
      `[Gemini AI] Model: ${model} | Duration: ${durationMs}ms | ` +
        `Finish: ${finishReason ?? "unknown"} | ` +
        `Completion tokens: ${completion.usage?.completion_tokens ?? "unknown"}`
    )

    return completion
  } catch (error: unknown) {
    const normalized = normalizeGeminiError(error)
    console.warn(
      `[Gemini AI] Fallback failed | Code: ${normalized.code ?? "unknown"} | ` +
        `Status: ${normalized.status ?? "unknown"} | Error: ${normalized.message}`
    )
    throw normalized
  } finally {
    clearTimeout(timeout)
  }
}
