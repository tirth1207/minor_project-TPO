/**
 * NVIDIA NIM chat completion wrapper.
 *
 * Uses the OpenAI-compatible NVIDIA NIM API.
 * Server-side only.
 *
 * Features:
 * - Retry with exponential backoff
 * - Precise timeout and duration logging
 * - Transient failure classification
 * - Detects truncated responses
 * - Never logs API keys
 * - Never logs full AI responses
 * - Model configurable through NVIDIA_MODEL
 * - NVIDIA endpoint configurable through NVIDIA_NIM_ENDPOINT
 * - Optional Gemini fallback through AI_FALLBACK_PROVIDER=gemini
 */

import OpenAI from "openai";
import { callGeminiChat } from "./gemini";

export type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type NvidiaRetryOptions = {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number;
  maxTokens?: number;
};

interface NvidiaApiError extends Error {
  status?: number;
  code?: string;
  finishReason?: string | null;
}

function isRetriableError(error: NvidiaApiError | Error | null): boolean {
  if (!error) return false;

  const apiError = error as NvidiaApiError;

  if (apiError.code === "MAX_TOKENS_EXCEEDED") return true;
  if (!apiError.status) return true;

  const transientStatuses = [429, 500, 502, 503, 504];
  if (transientStatuses.includes(apiError.status)) return true;
  if (apiError.status >= 400 && apiError.status < 500) return false;

  return false;
}

async function delayWithBackoff(
  baseDelay: number,
  attempt: number,
  maxDelay: number
): Promise<void> {
  const delayMs = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
  const jitter = Math.floor(Math.random() * 250);
  const totalMs = delayMs + jitter;

  await new Promise<void>((resolve) => {
    setTimeout(resolve, totalMs);
  });
}

function normalizeNvidiaError(error: unknown): NvidiaApiError {
  const source = error as any;

  const normalized = new Error(
    source?.message || "NVIDIA AI service request failed"
  ) as NvidiaApiError;

  normalized.name = source?.name || "NVIDIAError";
  normalized.status = source?.status;
  normalized.code = source?.code;

  return normalized;
}

async function attemptNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  timeoutMs: number,
  maxTokens: number
): Promise<{
  success: boolean;
  completion: OpenAI.Chat.Completions.ChatCompletion;
  durationMs: number;
  error: NvidiaApiError | null;
}> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "NVIDIA_API_KEY environment variable is missing"
    ) as NvidiaApiError;

    error.status = 401;
    error.code = "MISSING_API_KEY";

    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs: 0,
      error,
    };
  }

  const endpoint =
    process.env.NVIDIA_NIM_ENDPOINT ||
    "https://integrate.api.nvidia.com/v1";

  const client = new OpenAI({
    apiKey,
    baseURL: endpoint,
    timeout: timeoutMs,
    maxRetries: 0,
  });

  const start = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: maxTokens,
      stream: false,
    });

    const durationMs = Date.now() - start;
    const choice = completion.choices?.[0];

    if (!choice) {
      const error = new Error(
        "NVIDIA returned an empty completion"
      ) as NvidiaApiError;
      error.code = "EMPTY_COMPLETION";

      return {
        success: false,
        completion,
        durationMs,
        error,
      };
    }

    const finishReason = choice.finish_reason;

    if (finishReason === "length") {
      const error = new Error(
        `NVIDIA response was truncated because max_tokens (${maxTokens}) was reached`
      ) as NvidiaApiError;

      error.code = "MAX_TOKENS_EXCEEDED";
      error.finishReason = finishReason;

      return {
        success: false,
        completion,
        durationMs,
        error,
      };
    }

    if (finishReason !== "stop") {
      const error = new Error(
        `NVIDIA completion ended unexpectedly: ${finishReason || "unknown"}`
      ) as NvidiaApiError;

      error.code = "UNEXPECTED_FINISH_REASON";
      error.finishReason = finishReason;

      return {
        success: false,
        completion,
        durationMs,
        error,
      };
    }

    return {
      success: true,
      completion,
      durationMs,
      error: null,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - start;
    const apiError = normalizeNvidiaError(error);

    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs,
      error: apiError,
    };
  }
}

/**
 * Calls NVIDIA NIM chat completion with retries.
 *
 * NVIDIA remains the primary provider. Once its configured retry budget is
 * exhausted, Gemini is used only when AI_FALLBACK_PROVIDER=gemini (default).
 * The original messages are passed unchanged so every existing system
 * prompt, user prompt, JSON contract, parser, and Zod validator is preserved.
 */
export async function callNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  options?: NvidiaRetryOptions
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  if (!model || typeof model !== "string") {
    throw new Error("NVIDIA model is required");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("NVIDIA messages are required");
  }

  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3);
  const baseDelay = Math.max(0, options?.baseDelay ?? 1000);
  const maxDelay = Math.max(baseDelay, options?.maxDelay ?? 10000);
  const timeoutMs = Math.max(1000, options?.timeoutMs ?? 30000);

  let maxTokens = Math.max(1000, options?.maxTokens ?? 6000);
  let lastError: NvidiaApiError | Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await attemptNvidiaChat(
      model,
      messages,
      timeoutMs,
      maxTokens
    );

    if (result.success && result.completion) {
      const choice = result.completion.choices?.[0];

      console.log(
        `[NVIDIA AI] Model: ${model} | ` +
          `Attempt ${attempt}/${maxAttempts} succeeded | ` +
          `Duration: ${result.durationMs}ms | ` +
          `Finish: ${choice?.finish_reason ?? "unknown"} | ` +
          `Completion tokens: ${
            result.completion.usage?.completion_tokens ?? "unknown"
          }`
      );

      return result.completion;
    }

    lastError = result.error || new Error("NVIDIA AI service request failed");

    console.warn(
      `[NVIDIA AI] Attempt ${attempt}/${maxAttempts} failed | ` +
        `Duration: ${result.durationMs}ms | ` +
        `Code: ${(lastError as NvidiaApiError)?.code ?? "unknown"} | ` +
        `Error: ${lastError.message}`
    );

    if (!isRetriableError(lastError)) {
      console.error(
        `[NVIDIA AI] Non-retriable error: ${lastError.message}`
      );
      break;
    }

    if ((lastError as NvidiaApiError).code === "MAX_TOKENS_EXCEEDED") {
      const previousMaxTokens = maxTokens;

      maxTokens = Math.min(Math.floor(maxTokens * 1.5), 12000);

      console.warn(
        `[NVIDIA AI] Response was truncated. ` +
          `Increasing max_tokens from ${previousMaxTokens} ` +
          `to ${maxTokens} before retry.`
      );
    }

    if (attempt < maxAttempts) {
      await delayWithBackoff(baseDelay, attempt, maxDelay);
    }
  }

  /**
   * Provider fallback.
   *
   * This happens only after NVIDIA's own retries are exhausted. The exact
   * same message array is forwarded to Gemini, including the unchanged
   * system prompt used by mock interview, evaluator, and career roadmap.
   */
  const fallbackProvider =
    process.env.AI_FALLBACK_PROVIDER?.trim().toLowerCase() || "gemini";

  if (fallbackProvider === "gemini") {
    const fallbackMaxTokens = Math.min(Math.max(maxTokens, 12000), 16000);

    console.warn(
      `[AI Provider] NVIDIA exhausted its retries. Falling back to Gemini ` +
        `(${process.env.GEMINI_MODEL || "gemini-3.5-flash"}) with ` +
        `maxOutputTokens=${fallbackMaxTokens}.`
    );

    try {
      return await callGeminiChat(messages, {
        timeoutMs,
        maxTokens: fallbackMaxTokens,
      });
    } catch (geminiError: any) {
      console.error(
        `[AI Provider] Gemini fallback failed: ${geminiError?.message || "unknown error"}`
      );

      throw new Error(
        `AI service failed: NVIDIA exhausted retries and Gemini fallback failed (${geminiError?.message || "service unavailable"})`
      );
    }
  }

  throw (
    lastError ||
    new Error("NVIDIA AI service request failed after retries")
  );
}

/**
 * Convenience helper.
 * Uses NVIDIA_MODEL from environment variables.
 */
export async function callNvidiaChatWithConfiguredModel(
  messages: NvidiaMessage[],
  options?: NvidiaRetryOptions
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const model = process.env.NVIDIA_MODEL;

  if (!model) {
    throw new Error("NVIDIA_MODEL environment variable is missing");
  }

  return callNvidiaChat(model, messages, options);
}

export type { MockInterviewQuestion } from "@/types/mock-interview";
