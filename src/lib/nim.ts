import type { NextResponse } from 'next/server'

/**
 * Generate mock interview questions using NVIDIA NIM API.
 * The function sends a system prompt and the job role context to the model
 * and returns an array of question objects: { id: number, text: string }.
 *
 * If the API call fails, a fallback set of generic questions is returned.
 */
export async function generateMockQuestions(jobRoleContext: string): Promise<{ id: number; text: string }[]> {
  const endpoint = process.env.NVIDIA_NIM_ENDPOINT
  const apiKey = process.env.NVIDIA_NIM_API_KEY

  // Fallback generic questions
  const fallback = [
    { id: 1, text: 'Explain the difference between Server and Client Components in Next.js (App Router).' },
    { id: 2, text: 'Describe how the virtual DOM works and how React uses reconciliation to optimize rendering.' },
    { id: 3, text: 'How do you optimize a web application\'s initial loading performance (e.g., Code Splitting, Lazy Loading)?' }
  ]

  if (!endpoint || !apiKey) {
    // No NIM configuration – return fallback
    return fallback
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama3-8b-instruct', // example model, adjust as needed
        stream: false,
        messages: [
          {
            role: 'system',
            content: `You are an AI interview question generator. Generate exactly three concise technical interview questions (each one sentence) based on the given job role context. Do not include any explanations or numbering, just return an array of question strings.`
          },
          { role: 'user', content: jobRoleContext }
        ]
      })
    })

    if (!response.ok) {
      console.error('NIM API error:', response.status, await response.text())
      return fallback
    }

    const data = await response.json()
    // Expected format: { choices: [{ message: { content: 'question1\nquestion2\nquestion3' } }] }
    const content = data?.choices?.[0]?.message?.content || ''
    const lines = content
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)

    // Build question objects with sequential ids
      const questions = lines.slice(0, 3).map((text: string, idx: number) => ({ id: idx + 1, text }))
    // Ensure we always return three questions
    if (questions.length === 3) return questions
    return fallback
  } catch (err) {
    console.error('Failed to call NVIDIA NIM:', err)
    return fallback
  }
}
