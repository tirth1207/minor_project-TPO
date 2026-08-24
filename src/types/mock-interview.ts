export type MockQuestionType = 'MCQ' | 'THEORY' | 'CODE' | 'BEHAVIORAL'
export type MockInterviewType = 'PRACTICE' | 'JOB_REQUIRED'
export type MockInterviewStatus = 'REQUESTED' | 'QUEUED' | 'PROCESSING' | 'ANSWERING' | 'EVALUATING' | 'EVALUATED' | 'FAILED' | 'COMPLETED'

export interface MCQOption {
  id: string
  text: string
}

export interface MCQQuestion {
  id: string
  type: 'MCQ'
  question: string
  options: MCQOption[]
  correctOptionId?: string // Hidden from student until evaluated
  explanation?: string // Hidden from student until evaluated
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  skill: string
  points: number
}

export interface TheoryQuestion {
  id: string
  type: 'THEORY' | 'BEHAVIORAL'
  question: string
  expectedTopics?: string[]
  rubric?: string
  referenceAnswer?: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  skill: string
  points: number
}

export interface CodeExample {
  input: string
  output: string
  explanation?: string
}

export interface CodeQuestion {
  id: string
  type: 'CODE'
  question: string
  description?: string
  constraints?: string[]
  examples?: CodeExample[]
  languageOptions?: string[]
  defaultLanguage?: string
  starterCode?: string
  expectedConcepts?: string[]
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  skill: string
  points: number
}

export type MockInterviewQuestion = MCQQuestion | TheoryQuestion | CodeQuestion

// Sanitized version sent to candidate during test
export type SanitizedQuestion = Omit<MCQQuestion, 'correctOptionId' | 'explanation'> | Omit<TheoryQuestion, 'rubric' | 'referenceAnswer'> | CodeQuestion

export interface StudentAnswer {
  questionId: string
  selectedOptionId?: string // for MCQ
  answerText?: string // for Theory/Code
  codeLanguage?: string // for Code
}

export interface QuestionEvaluation {
  questionId: string
  type: MockQuestionType
  pointsPossible: number
  pointsEarned: number
  isCorrect?: boolean
  verdict: 'strong' | 'partial' | 'needs-work'
  feedback: string
  strengths: string[]
  improvements: string[]
}

export interface MockEvaluationResult {
  overallScore: number // 0-100
  mcqScore: number // 0-100
  theoryScore: number // 0-100
  codingScore: number // 0-100
  passed: boolean
  summary: string
  skillScores: Record<string, number>
  strengths: string[]
  improvements: string[]
  recommendedNextSteps: string[]
  questionEvaluations: QuestionEvaluation[]
}
