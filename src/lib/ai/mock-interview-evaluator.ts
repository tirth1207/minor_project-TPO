import { callNvidiaChat } from './nvidia'
import type { MockInterviewQuestion, MockInterviewAnswer, MockInterviewReport } from '@/types/mock-interview'

/**
 * Evaluate a completed mock interview.
 * Sends the full set of questions, rubrics, reference answers, and candidate answers to NVIDIA.
 * Expects a strict JSON report matching {@link MockInterviewReport}.
 */
export async function evaluateMockInterview(
  questions: MockInterviewQuestion[],
  answers: MockInterviewAnswer[],
  jobInfo?: any
): Promise<MockInterviewReport> {
  const systemPrompt = `You are a rigorous technical interview evaluator.
You will receive a JSON object containing:
- an array of questions (id, type, prompt, rubric, referenceAnswer, language)
- an array of candidate answers (questionId, answer, language)
- optional job context information.
For each question, produce a result object with:
{
  "questionId": "q1",
  "score": 0-100,
  "verdict": "strong" | "partial" | "needs-work",
  "summary": "brief feedback",
  "strengths": ["..."],
  "improvements": ["..."]
}
After processing all questions, compute an overallScore (average of scores) and a concise summary.
Return ONLY a JSON object with fields: overallScore, summary, results (array as described).
`
  const payload = {
    questions,
    answers,
    jobInfo: jobInfo || null,
  }
  const userPrompt = `Interview data: ${JSON.stringify(payload)}`
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
  const data = await callNvidiaChat('meta/llama-3.1-70b-instruct', messages)
  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('Empty AI evaluation response')
  }
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse evaluation JSON', raw)
    throw new Error('Malformed evaluation response')
  }
  // Basic shape validation
  if (typeof parsed.overallScore !== 'number' || !Array.isArray(parsed.results)) {
    throw new Error('Invalid evaluation format')
  }
  return parsed as MockInterviewReport
}
