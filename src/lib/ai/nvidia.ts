/**
 * NVIDIA NIM chat completion wrapper.
 *
 * Uses the OpenAI-compatible NVIDIA NIM API.
 * Server-side only.
 *
 * Features:
 * - Environment variable validation (NVIDIA_API_KEY, NVIDIA_NIM_ENDPOINT, NVIDIA_MODEL)
 * - Retry with exponential backoff (default 3 attempts)
 * - Precise timeout and duration logging without exposing secrets
 * - Transient failure classification (timeout, 429, 500-504)
 * - Non-retriable: 400, 401, 403, invalid model, malformed request
 */

import OpenAI from "openai";

export type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Structured retry options for NVIDIA calls.
 */
export type NvidiaRetryOptions = {
  /** Maximum number of attempts (including the first try). Default: 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds for exponential backoff. Default: 2000 */
  baseDelay?: number;
  /** Maximum delay in milliseconds for backoff. Default: 30000 */
  maxDelay?: number;
};

/**
 * NVIDIA API error type, extending Error with status and code.
 */
interface NvidiaApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Server-side environment variable validation helper for AI configuration.
 */
export function validateAiEnvironment(): { ok: boolean; error?: string } {
  const apiKey = process.env.NVIDIA_API_KEY;
  const endpoint = process.env.NVIDIA_NIM_ENDPOINT;
  const model = process.env.NVIDIA_MODEL;

  if (!apiKey || !apiKey.trim()) {
    return {
      ok: false,
      error: "AI service configuration error: Missing NVIDIA_API_KEY.",
    };
  }
  if (!endpoint || !endpoint.trim()) {
    return {
      ok: false,
      error: "AI service configuration error: Missing NVIDIA_NIM_ENDPOINT.",
    };
  }
  if (!model || !model.trim()) {
    return {
      ok: false,
      error: "AI service configuration error: Missing NVIDIA_MODEL.",
    };
  }
  return { ok: true };
}

/**
 * Classify an error as retriable or not.
 * Transient failures are retried; permanent failures are not.
 */
function isRetriableError(error: any): boolean {
  const status = error?.status;

  // Retry on timeout / network errors (no status code)
  if (!status) {
    return true;
  }

  // Retry on transient status codes
  const transientStatuses = [429, 500, 502, 503, 504];
  if (transientStatuses.includes(status)) {
    return true;
  }

  // Do NOT retry on client errors (bad request, auth, forbidden)
  if (status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  return false;
}

/**
 * Delay function for exponential backoff with jitter.
 * Returns a promise that resolves after the calculated delay duration.
 */
async function delayWithBackoff(
  baseDelay: number,
  attempt: number,
  maxDelay: number
): Promise<number> {
  const delayMs = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
  const jitter = Math.random() * 100;
  const totalMs = Math.round(delayMs + jitter);
  await new Promise((resolve) => setTimeout(resolve, totalMs));
  return totalMs;
}

/**
 * Make a single NVIDIA chat completion attempt with timing.
 */
async function attemptNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  timeoutMs: number
): Promise<{
  success: boolean;
  completion: OpenAI.Chat.Completions.ChatCompletion;
  durationMs: number;
  error: Error | NvidiaApiError | null;
}> {
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY!,
    baseURL: process.env.NVIDIA_NIM_ENDPOINT,
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
      max_tokens: 1500,
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
    const apiError: NvidiaApiError = {
      message: error?.message || "AI service request failed",
      name: error?.name || "NVIDIAError",
      status: error?.status,
      code: error?.code,
    };

    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs,
      error: apiError,
    };
  }
}

/**
 * Primary NVIDIA chat completion function with retry logic.
 */
export async function callNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  options?: NvidiaRetryOptions
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const envCheck = validateAiEnvironment();
  if (!envCheck.ok) {
    throw new Error(envCheck.error);
  }

  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 2000;
  const maxDelay = options?.maxDelay ?? 30000;
  const timeoutMs = 30_000; // 30 second per-attempt timeout

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await attemptNvidiaChat(model, messages, timeoutMs);

    if (result.success && result.completion) {
      console.log(
        `[NVIDIA_AI] operation=chat_completion model=${model} attempt=${attempt}/${maxAttempts} durationMs=${result.durationMs} status=SUCCESS`
      );
      return result.completion;
    }

    lastError = (result.error as Error) || lastError;

    if (attempt >= maxAttempts) {
      console.error(
        `[NVIDIA_AI] operation=chat_completion model=${model} attempt=${attempt}/${maxAttempts} durationMs=${result.durationMs} status=FAILED_ALL_ATTEMPTS error="${lastError.message}"`
      );
      break;
    }

    if (!isRetriableError(result.error)) {
      console.error(
        `[NVIDIA_AI] operation=chat_completion model=${model} attempt=${attempt}/${maxAttempts} durationMs=${result.durationMs} status=NON_RETRIABLE_ERROR error="${result.error?.message}"`
      );
      break;
    }

    console.warn(
      `[NVIDIA_AI] operation=chat_completion model=${model} attempt=${attempt}/${maxAttempts} durationMs=${result.durationMs} status=RETRYING error="${result.error?.message}"`
    );

    await delayWithBackoff(baseDelay, attempt, maxDelay);
  }

  throw lastError || new Error("AI service request failed after all retries");
}
