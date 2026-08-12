export type MockInterviewQuestion = {
  id: string
  type: 'behavioral' | 'technical' | 'coding'
  prompt: string
  rubric: string
  referenceAnswer?: string
  language?: string
}

export type MockInterviewAnswer = {
  questionId: string
  answer: string
  language?: string
}

export type MockInterviewResult = {
  questionId: string
  score: number // 0-100
  verdict: 'strong' | 'partial' | 'needs-work'
  summary: string
  strengths: string[]
  improvements: string[]
}

export type MockInterviewReport = {
  overallScore: number // 0-100
  summary: string
  results: MockInterviewResult[]
}
