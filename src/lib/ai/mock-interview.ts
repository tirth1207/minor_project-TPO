import { callNvidiaChat } from './nvidia'
import type { MockInterviewQuestion } from '@/types/mock-interview'

/**
 * Generate a set of interview questions for a given role.
 * Returns an array of {@link MockInterviewQuestion} objects.
 */
export async function generateMockInterview(jobRoleContext: string, jobInfo?: any): Promise<MockInterviewQuestion[]> {
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
  const userPrompt = `Role: ${jobRoleContext}\n${jobInfo ? `Job description: ${jobInfo.description}\nRequired skills: ${jobInfo.skills?.join(', ')}` : ''}`
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
  const data = await callNvidiaChat('meta/llama-3.1-70b-instruct', messages)
  // Expect data.choices[0].message.content to contain JSON.
  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('Empty AI response')
  }
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse AI response', raw)
    throw new Error('Malformed AI response')
  }
  if (!Array.isArray(parsed) || parsed.length < 3) {
    throw new Error('AI returned insufficient questions')
  }
  // Basic validation of each object.
  const questions: MockInterviewQuestion[] = parsed.map((q: any) => {
    if (!q.id || !q.type || !q.prompt || !q.rubric) {
      throw new Error('Invalid question format')
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
