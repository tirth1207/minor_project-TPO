/**
 * NVIDIA NIM chat completion wrapper.
 *
 * Uses the OpenAI-compatible NVIDIA NIM API.
 * Server-side only.
 *
 * Features:
 * - Retry with exponential backoff (default 3 attempts)
 * - Precise timeout and duration logging
 * - Transient failure classification (timeout, 429, 500-504)
 * - Non-retriable: 400, 401, 403, missing key, invalid model, malformed request
 * - Model configured via NVIDIA_MODEL environment variable
 * - API key never logged or exposed to client
 */

import OpenAI from "openai";

export type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type NvidiaRetryOptions = {
  /** Maximum number of attempts (including the first try). Default: 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds for exponential backoff. Default: 2000 */
  baseDelay?: number;
  /** Maximum delay in milliseconds for backoff. Default: 30000 */
  maxDelay?: number;
};

interface NvidiaApiError extends Error {
  status?: number;
  code?: string;
}

function isRetriableError(error: any): boolean {
  if (!error) return false;
  const status = error.status;

  // Retry on timeout / network errors (no status code)
  if (!status) {
    return true;
  }

  // Retry on transient status codes
  const transientStatuses = [429, 500, 502, 503, 504];
  if (transientStatuses.includes(status)) {
    return true;
  }

  // Do NOT retry on client errors
  if (status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  return false;
}

async function delayWithBackoff(
  baseDelay: number,
  attempt: number,
  maxDelay: number
): Promise<void> {
  const delayMs = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
  const jitter = Math.random() * 100;
  const totalMs = delayMs + jitter;
  return new Promise((resolve) => setTimeout(resolve, totalMs));
}

async function attemptNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  timeoutMs: number,
  attempt: number
): Promise<{
  success: boolean;
  completion: OpenAI.Chat.Completions.ChatCompletion;
  durationMs: number;
  error: Error | NvidiaApiError | null;
}> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    const error: NvidiaApiError = new Error("NVIDIA_API_KEY environment variable is missing");
    error.status = 401;
    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs: 0,
      error,
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.NVIDIA_NIM_ENDPOINT || "https://integrate.api.nvidia.com/v1",
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
      max_tokens: 1200,
      stream: false,
    });

    const durationMs = Date.now() - start;
    return {
      success: true,
      completion,
      durationMs,
      error: null,
    };
  } catch (error: any) {
    const durationMs = Date.now() - start;
    const apiError: NvidiaApiError = new Error(error?.message || "AI service request failed");
    apiError.name = error?.name || "NVIDIAError";
    apiError.status = error?.status;
    apiError.code = error?.code;

    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs,
      error: apiError,
    };
  }
}

export async function callNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  options?: NvidiaRetryOptions
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 10000;
  const timeoutMs = 30_000;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await attemptNvidiaChat(
      model,
      messages,
      timeoutMs,
      attempt
    );

    if (result.success && result.completion) {
      console.log(
        `[NVIDIA AI] Model: ${model} | Attempt ${attempt}/${maxAttempts} succeeded in ${result.durationMs}ms`
      );
      return result.completion;
    }

    lastError = (result.error as Error) || lastError;

    if (!isRetriableError(result.error)) {
      console.error(
        `[NVIDIA AI] Non-retriable error on attempt ${attempt}/${maxAttempts}: ${result.error?.message}`
      );
      break;
    }

    if (attempt < maxAttempts) {
      console.warn(
        `[NVIDIA AI] Attempt ${attempt}/${maxAttempts} failed in ${result.durationMs}ms (${result.error?.message}). Retrying...`
      );
      await delayWithBackoff(baseDelay, attempt, maxDelay);
    }
  }

  throw lastError || new Error("AI service request failed after retries");
}

export type { MockInterviewQuestion } from "@/types/mock-interview";
