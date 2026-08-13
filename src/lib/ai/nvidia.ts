/**
 * NVIDIA NIM chat completion wrapper.
 *
 * Uses the OpenAI-compatible NVIDIA NIM API.
 * Server-side only.
 */

import OpenAI from "openai";

type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callNvidiaChat(
  model: string,
  messages: NvidiaMessage[]
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const endpoint = process.env.NVIDIA_NIM_ENDPOINT;
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    console.error("NVIDIA_API_KEY not configured");
    throw new Error("AI service unavailable");
  }

  if (!endpoint) {
    console.error("NVIDIA_NIM_ENDPOINT not configured");
    throw new Error("AI service unavailable");
  }

  try {
    console.log("[NVIDIA] Starting request...");
    console.log("[NVIDIA] Model:", model);
    console.log("[NVIDIA] Endpoint:", endpoint);

    const client = new OpenAI({
      apiKey,
      baseURL: endpoint,

      // IMPORTANT:
      // Prevent the request from hanging indefinitely.
      timeout: 60_000,
      maxRetries: 0,
    });

    const start = Date.now();

    const completion = await client.chat.completions.create({
      model,
      messages,

      temperature: 0.2,
      top_p: 0.7,

      // 4096 is excessive for this report.
      max_tokens: 2000,

      stream: false,
    });

    console.log(
      `[NVIDIA] Request completed in ${Date.now() - start}ms`
    );

    console.log(
      "[NVIDIA] Response length:",
      completion.choices?.[0]?.message?.content?.length ?? 0
    );

    return completion;
  } catch (error: any) {
    console.error("[NVIDIA] Request failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      name: error?.name,
    });

    throw new Error(
      error?.message || "AI service request failed"
    );
  }
}