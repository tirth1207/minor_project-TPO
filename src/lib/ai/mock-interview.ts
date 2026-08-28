import { callNvidiaChat } from './nvidia'
import { cleanAndParseJson } from './json-parser'
import type { MockInterviewQuestion } from '@/types/mock-interview'
import type { NvidiaMessage } from './nvidia'
import { z } from 'zod'

function normalizeSkill(skill: any): string {
  if (typeof skill !== 'string' || !skill.trim()) return 'General Technical'
  const trimmed = skill.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const MCQSchema = z.object({
  id: z.string(),
  type: z.literal('MCQ'),
  question: z.string().min(5),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ).min(2),
  correctOptionId: z.string(),
  explanation: z.string().optional().default(''),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  skill: z.string().transform(normalizeSkill),
  points: z.number().default(10),
})

const TheorySchema = z.object({
  id: z.string(),
  type: z.enum(['THEORY', 'BEHAVIORAL']),
  question: z.string().min(5),
  expectedTopics: z.array(z.string()).default([]),
  rubric: z.string().optional().default(''),
  referenceAnswer: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  skill: z.string().transform(normalizeSkill),
  points: z.number().default(10),
})

const CodeSchema = z.object({
  id: z.string(),
  type: z.literal('CODE'),
  question: z.string().min(5),
  description: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  examples: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().optional(),
    })
  ).default([]),
  languageOptions: z.array(z.string()).default(['JavaScript', 'TypeScript', 'Python', 'Java', 'C++']),
  defaultLanguage: z.string().default('TypeScript'),
  starterCode: z.string().optional(),
  expectedConcepts: z.array(z.string()).default([]),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('HARD'),
  skill: z.string().transform(normalizeSkill),
  points: z.number().default(15),
})

const QuestionUnionSchema = z.discriminatedUnion('type', [
  MCQSchema,
  TheorySchema,
  TheorySchema.extend({ type: z.literal('BEHAVIORAL') }),
  CodeSchema,
])

export async function generateStructuredMockInterview(
  mockType: 'PRACTICE' | 'JOB_REQUIRED',
  jobRoleContext: string,
  jobInfo?: any,
  studentCareerContext?: any
): Promise<MockInterviewQuestion[]> {
  const model = process.env.NVIDIA_MODEL ?? "openai/gpt-oss-120b"

  const systemPrompt = `You are an expert technical interviewer and assessment designer.
Generate a realistic, balanced technical interview assessment.

Return ONLY a JSON array of question objects without markdown text or code fences.
Each question MUST be one of the following 3 structured types:

1. MCQ Question:
{
  "id": "q1",
  "type": "MCQ",
  "question": "Question text...",
  "options": [
    { "id": "opt1", "text": "Option A text" },
    { "id": "opt2", "text": "Option B text" },
    { "id": "opt3", "text": "Option C text" },
    { "id": "opt4", "text": "Option D text" }
  ],
  "correctOptionId": "opt1",
  "explanation": "Why opt1 is correct",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "skill": "React",
  "points": 10
}

2. THEORY Question:
{
  "id": "q2",
  "type": "THEORY",
  "question": "Explain optimistic vs pessimistic locking in database transactions.",
  "expectedTopics": ["Optimistic locking", "Pessimistic locking", "Concurrency"],
  "rubric": "Look for explicit trade-offs and performance implications.",
  "referenceAnswer": "Detailed expected reference answer...",
  "difficulty": "MEDIUM",
  "skill": "PostgreSQL",
  "points": 10
}

3. CODE Question:
{
  "id": "q3",
  "type": "CODE",
  "question": "Implement an API rate limiter function.",
  "description": "Write a function rateLimiter(userId, windowMs, maxRequests) that returns boolean.",
  "constraints": ["1 <= maxRequests <= 1000", "windowMs is in milliseconds"],
  "examples": [
    { "input": "userId='u1', windowMs=1000, maxRequests=2", "output": "true", "explanation": "First call succeeds" }
  ],
  "languageOptions": ["JavaScript", "TypeScript", "Python", "Java", "C++"],
  "defaultLanguage": "TypeScript",
  "starterCode": "function rateLimiter(userId: string, windowMs: number, maxRequests: number): boolean {\\n  // Your code here\\n}",
  "expectedConcepts": ["Sliding window", "Map / Hash table", "Timestamps"],
  "difficulty": "HARD",
  "skill": "System Architecture",
  "points": 15
}

Generate between 6 to 10 questions total with a balanced distribution.
Do NOT generate generic filler questions.
`

  let userPrompt = ""

  if (mockType === "JOB_REQUIRED" && jobInfo) {
    userPrompt = `Mode: JOB_REQUIRED
Target Job Title: ${jobInfo.title || jobRoleContext}
Role: ${jobRoleContext}
Company: ${jobInfo.companyName || "Employer"}
Job Description: ${jobInfo.description || "N/A"}
Required Skills: ${Array.isArray(jobInfo.skills) ? jobInfo.skills.join(", ") : jobInfo.skills || "N/A"}
CTC: ${jobInfo.ctcMax ? `₹${jobInfo.ctcMax} LPA` : "N/A"}

Tailor EVERY question strictly to this exact job specification.`
  } else {
    userPrompt = `Mode: PRACTICE
Role Focus: ${jobRoleContext}
Student Current Skills: ${studentCareerContext?.current_skills?.join(", ") || "General"}
Student Target Skills: ${studentCareerContext?.dream_skills?.join(", ") || "General"}
Target CTC: ${studentCareerContext?.dream_ctc ? `₹${studentCareerContext.dream_ctc} LPA` : "N/A"}
Skill Level: ${studentCareerContext?.skill_level || "Intermediate"}

Generate a comprehensive practice mock interview to help master this role.`
  }

  const messages: NvidiaMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]

  let raw = ""
  try {
    const data = await callNvidiaChat(model, messages)
    raw = data?.choices?.[0]?.message?.content?.trim() || ""
  } catch (err: any) {
    console.error("AI Mock generation call failed:", err)
    throw new Error(`AI Mock Question Service failed: ${err?.message || "Service unavailable"}`)
  }

  if (!raw) throw new Error("Empty AI response received")

  const parsed = cleanAndParseJson(raw)

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AI returned an empty question list")
  }

  const validatedQuestions: MockInterviewQuestion[] = []

  for (let i = 0; i < parsed.length; i++) {
    const rawQ = parsed[i]
    if (!rawQ || typeof rawQ !== 'object') continue
    if (!rawQ.id) rawQ.id = `q${i + 1}`
    if (!rawQ.points) rawQ.points = rawQ.type === 'CODE' ? 15 : 10

    const result = QuestionUnionSchema.safeParse(rawQ)
    if (result.success) {
      validatedQuestions.push(result.data as MockInterviewQuestion)
    } else {
      console.warn(`Question ${i + 1} validation failed:`, result.error.format())
    }
  }

  if (validatedQuestions.length < 3) {
    throw new Error("Failed to validate sufficient AI generated questions (minimum 3 required)")
  }

  return validatedQuestions
}

export async function generateMockInterview(
  jobRoleContext: string,
  jobInfo?: any
): Promise<MockInterviewQuestion[]> {
  return generateStructuredMockInterview('PRACTICE', jobRoleContext, jobInfo)
}
