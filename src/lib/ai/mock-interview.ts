import { callNvidiaChat } from './nvidia'
import type { MockInterviewQuestion } from '@/types/mock-interview'
import type { NvidiaMessage } from './nvidia'

/**
 * Generate a set of interview questions for a given role.
 * Returns an array of {@link MockInterviewQuestion} objects.
 *
 * The model is configured via the NVIDIA_MODEL environment variable.
 * Controlled retry logic is handled by the callNvidiaChat wrapper.
 */
export async function generateMockInterview(
  jobRoleContext: string,
  jobInfo?: any
): Promise<MockInterviewQuestion[]> {
  const model = process.env.NVIDIA_MODEL ?? "meta/llama-3.2-3b-instruct"

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
`

  const userPrompt = `Role: ${jobRoleContext}${
    jobInfo ? `Job description: ${jobInfo.description}` : ""
  }${jobInfo && jobInfo.skills ? `Required skills: ${jobInfo.skills.join(", ")}` : ""}`

  const messages: NvidiaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]

  const data = await callNvidiaChat(model, messages)

  // Expect data.choices[0].message.content to contain JSON.
  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error("Empty AI response")
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error("Failed to parse AI response", raw)
    throw new Error("Malformed AI response")
  }

  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error("AI returned insufficient questions")
  }

  // Validate each question has required fields and normalize to MockInterviewQuestion
  const questions: MockInterviewQuestion[] = parsed.map((q: any) => {
    if (!q.id || !q.type || !q.prompt || !q.rubric) {
      throw new Error("Invalid question format from AI")
    }
    return {
      id: String(q.id),
      type: q.type,
      prompt: q.prompt,
      rubric: q.rubric,
      referenceAnswer: q.referenceAnswer,
      language: q.language,
    }
  })

  return questions
}