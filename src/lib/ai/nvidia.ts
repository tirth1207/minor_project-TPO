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
 * - Non-retriable: 400, 401, 403, invalid model, malformed request
 * - Model configured via NVIDIA_MODEL environment variable
 * - API key never logged or exposed to client
 */

import OpenAI from "openai";
import type { MockInterviewQuestion } from "@/types/mock-interview";

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
 * Classify an error as retriable or not.
 * Transient failures are retried; permanent failures are not.
 */
function isRetriableError(error: any): boolean {
  const status = error.status;
  const code = error.code;

  // Retry on timeout / network errors (no status code)
  if (!status) {
    return true;
  }

  // Retry on these HTTP status codes
  const transientStatuses = [429, 500, 502, 503, 504];
  if (transientStatuses.includes(status)) {
    return true;
  }

  // Do NOT retry on client errors (bad request, auth, forbidden)
  if (status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  // Do NOT retry on other non-transient codes
  return false;
}

/**
 * Delay function for exponential backoff with jitter.
 */
async function delayWithBackoff(
  baseDelay: number,
  attempt: number,
  maxDelay: number
): Promise<number> {
  const delayMs = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
  const jitter = Math.random() * 100;
  const totalMs = delayMs + jitter;
  return new Promise((resolve) => setTimeout(resolve, totalMs));
}

/**
 * Make a single NVIDIA chat completion attempt with timing.
 */
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
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY!,
    baseURL: process.env.NVIDIA_NIM_ENDPOINT,
    timeout: timeoutMs,
    maxRetries: 0,
  });

  const start = Date.now();

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1000,
      stream: false,
    });
  } catch (error: any) {
    const apiError: NvidiaApiError = {
      message: error?.message || "AI service request failed",
      name: error?.name || "NVIDIAError",
      status: error?.status,
      code: error?.code,
    };
    const durationMs = Date.now() - start;

    return {
      success: false,
      completion: {} as OpenAI.Chat.Completions.ChatCompletion,
      durationMs,
      error: apiError,
    };
  }

  const durationMs = Date.now() - start;

  return {
    success: true,
    completion,
    durationMs,
    error: null,
  };
}

/**
 * Primary NVIDIA chat completion function with retry logic.
 *
 * @param model - The NVIDIA model identifier (e.g. "meta/llama-3.1-70b-instruct")
 * @param messages - The chat messages (system + user prompts)
 * @param options - Retry configuration (optional)
 * @returns The chat completion response
 * @throws Error if all attempts fail or response is invalid
 */
export async function callNvidiaChat(
  model: string,
  messages: NvidiaMessage[],
  options?: NvidiaRetryOptions
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 2000;
  const maxDelay = options?.maxDelay ?? 30000;
  const timeoutMs = 30_000; // 30 second per-attempt timeout

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
        `[NVIDIA] Attempt ${attempt}/${maxAttempts} success in ${result.durationMs}ms`
      );
      return result.completion;
    }

    lastError = result.error as Error || lastError;

    // If this is the last attempt, stop retrying
    if (attempt >= maxAttempts) {
      break;
    }

    // Check if the error is retriable
    if (!isRetriableError(result.error)) {
      console.log(
        `[NVIDIA] Attempt ${attempt}/${maxAttempts} non-retriable error: ${result.error?.message}`
      );
      break;
    }

    // Log the retry attempt with duration
    console.log(
      `[NVIDIA] Attempt ${attempt}/${maxAttempts} failed after ${result.durationMs}ms: ${
        result.error?.message || "unknown error"
      } [NVIDIA] Retrying in...`
    );

    // Wait with exponential backoff before next attempt
    const waitMs = await delayWithBackoff(baseDelay, attempt, maxDelay);
    await waitMs;
  }

  console.log(
    `[NVIDIA] All ${maxAttempts} attempts failed${
      lastError ? `: ${lastError.message}` : ""
    } [NVIDIA] Last error type: ${lastError?.name || "unknown"}`
  );

  throw lastError || new Error("AI service request failed after all retries");
}

/**
 * Convenience wrapper that uses the configured NVIDIA model from environment.
 */
export async function generateMockInterview(
  jobRoleContext: string,
  options?: NvidiaRetryOptions
): Promise<MockInterviewQuestion[]> {
  const model = process.env.NVIDIA_MODEL ?? "meta/llama-3.2-3b-instruct";

  // Build a system prompt that instructs the model to output strict JSON.
  const systemPrompt = `You are an expert interview designer.
Generate exactly five interview questions (a mix of behavioral, technical, and coding) for the role described.
Each question must be an object with the following fields:
{
  "id": "q1" (string),
  "type": "behavioral" | "technical" | "coding",
  "prompt": "question text",
  "rubric": "what the evaluator should look for",
  "referenceAnswer": "ideal answer (optional)",
  "language": "javascript|typescript|python|java" (only for coding questions)
}
If a job description is provided, tailor the questions to that context.
Return ONLY a JSON array of the question objects, no surrounding text.
`;

  const userPrompt = `Role: ${jobRoleContext}`;

  const messages: NvidiaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const completion = await callNvidiaChat(model, messages, options);

  // Expect data.choices[0].message.content to contain JSON.
  const raw = completion?.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Empty AI response");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse AI response", raw);
    throw new Error("Malformed AI response");
  }

  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error("AI returned insufficient questions");
  }

  // Validate each question has required fields and normalize to MockInterviewQuestion
  const questions: MockInterviewQuestion[] = parsed.map(
    (q: any) => {
      if (!q.id || !q.type || !q.prompt || !q.rubric) {
        throw new Error("Invalid question format from AI");
      }
      return {
        id: String(q.id),
        type: q.type,
        prompt: q.prompt,
        rubric: q.rubric,
        referenceAnswer: q.referenceAnswer,
        language: q.language,
      };
    }
  );

  return questions;
}

/**
 * Type import - MockInterviewQuestion is re-exported from types
 */
export type { MockInterviewQuestion } from "@/types/mock-interview";