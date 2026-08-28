"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { QuestionnaireMCQ } from "@/components/mock-interview/questionnaire-mcq"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconAlertTriangle,
  IconCode,
  IconFileText,
  IconRefresh,
  IconBrain,
} from "@tabler/icons-react"
import type { MockInterviewQuestion, StudentAnswer, MockEvaluationResult } from "@/types/mock-interview"

export default function StudentMockExecutionPage() {
  const params = useParams()
  const mockId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [processing, setProcessing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [mockSession, setMockSession] = React.useState<any>(null)
  const [questions, setQuestions] = React.useState<MockInterviewQuestion[]>([])
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, StudentAnswer>>({})
  const [evaluationResult, setEvaluationResult] = React.useState<MockEvaluationResult | null>(null)

  const processInterview = React.useCallback(async () => {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}/process`, {
        method: "POST",
      })
      const json = await res.json()
      const mockData = json.data?.mock || json.mock

      if (res.ok && mockData) {
        setMockSession(mockData)
        if (Array.isArray(mockData.questions) && mockData.questions.length > 0) {
          setQuestions(mockData.questions)
        }
        if (mockData.status === "FAILED") {
          setError(json.error || "Question generation failed. Please try again.")
        }
      } else {
        setError(json.error || "Failed to process interview generation.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during processing.")
    } finally {
      setProcessing(false)
    }
  }, [mockId])

  const loadMockSession = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}`)
      const json = await res.json()
      const mockData = json.data?.mock || json.mock

      if (res.ok && mockData) {
        setMockSession(mockData)
        const qs = Array.isArray(mockData.questions) ? mockData.questions : []
        setQuestions(qs)

        if (mockData.status === "EVALUATED" && mockData.ai_results) {
          setEvaluationResult(mockData.ai_results)
        }

        if (Array.isArray(mockData.answers)) {
          const map: Record<string, StudentAnswer> = {}
          mockData.answers.forEach((ans: StudentAnswer) => {
            if (ans?.questionId) map[ans.questionId] = ans
          })
          setAnswers(map)
        }

        // If interview is in QUEUED, REQUESTED, or FAILED status, trigger process automatically
        if (["QUEUED", "REQUESTED"].includes(mockData.status)) {
          processInterview()
        }
      } else {
        setError(json.error || "Failed to fetch mock interview session.")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load session.")
    } finally {
      setLoading(false)
    }
  }, [mockId, processInterview])

  React.useEffect(() => {
    if (mockId) loadMockSession()
  }, [mockId, loadMockSession])

  // Polling mechanism while status is QUEUED or PROCESSING
  React.useEffect(() => {
    if (!mockSession) return
    const status = mockSession.status

    if (["QUEUED", "PROCESSING", "REQUESTED"].includes(status)) {
      const timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/students/mock-interviews/${mockId}`)
          const json = await res.json()
          const mockData = json.data?.mock || json.mock
          if (res.ok && mockData) {
            setMockSession(mockData)
            if (Array.isArray(mockData.questions) && mockData.questions.length > 0) {
              setQuestions(mockData.questions)
            }
            if (["ANSWERING", "EVALUATED", "FAILED"].includes(mockData.status)) {
              clearInterval(timer)
            }
          }
        } catch (err) {
          console.error("Polling error:", err)
        }
      }, 2500)

      return () => clearInterval(timer)
    }
  }, [mockId, mockSession?.status])

  const currentQ = questions[currentIdx]

  const handleMcqSelect = (qId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        questionId: qId,
        selectedOptionId: optionId,
      },
    }))
  }

  const handleTextChange = (qId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        answerText: text,
      },
    }))
  }

  const handleLanguageChange = (qId: string, lang: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        codeLanguage: lang,
      },
    }))
  }

  const handleSubmitAssessment = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const answerList = Object.values(answers)
      const res = await fetch(`/api/students/mock-interviews/${mockId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      })

      const json = await res.json()
      const resData = json.data || json

      if (res.ok && resData.result) {
        setEvaluationResult(resData.result)
        setMockSession(resData.mock)
      } else {
        setError(json.error || "Submission and evaluation failed.")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit assessment.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center flex-col space-y-2">
        <IconBrain className="h-8 w-8 animate-pulse text-primary" />
        <p className="text-xs text-zinc-500 font-medium">Loading AI Assessment Environment...</p>
      </div>
    )
  }

  if (error && !mockSession) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          {error || "Assessment session unavailable or access forbidden."}
        </div>
        <Link href="/student/mock">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Return to Mock Hub
          </Button>
        </Link>
      </div>
    )
  }

  // Preparation / Processing State
  if (mockSession && ["QUEUED", "PROCESSING", "REQUESTED"].includes(mockSession.status)) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950 shadow-sm space-y-4">
          <IconSparkles className="mx-auto h-10 w-10 text-amber-500 animate-spin" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Generating Technical Questions...
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Our AI engine is crafting custom MCQ, theory, and coding challenges tailored to{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{mockSession.job_role_context || "your role"}</strong>.
            </p>
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={processInterview}
              disabled={processing}
              className="h-8 text-xs gap-1.5"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${processing ? "animate-spin text-primary" : ""}`} />
              {processing ? "Processing..." : "Force Generation"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Generation Failed State
  if (mockSession && mockSession.status === "FAILED") {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/50 p-6 space-y-4">
          <IconAlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Question Generation Failed</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {error || "We encountered an issue generating your assessment questions. You can retry generation now."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="sm" onClick={processInterview} disabled={processing} className="h-8 text-xs gap-1.5">
              <IconRefresh className={`h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
              {processing ? "Retrying..." : "Retry Question Generation"}
            </Button>
            <Link href="/student/mock">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Back to Mock Hub
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Evaluation Report View (EVALUATED)
  if (mockSession?.status === "EVALUATED" || evaluationResult) {
    const report = evaluationResult || mockSession.ai_results
    const passThreshold = mockSession.job_spec_snapshot?.mockPassScore || 70
    const isPassed = Boolean(mockSession.passed)

    return (
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/student/mock">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
              <IconArrowLeft className="h-3.5 w-3.5" />
              Mock Hub
            </Button>
          </Link>

          {mockSession.job_college_mapping_id && (
            <Link href="/student/jobs">
              <Button size="sm" variant="default" className="h-8 text-xs">
                Back to Campus Jobs
              </Button>
            </Link>
          )}
        </div>

        {/* Score Header Card */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">
                  {mockSession.job_role_context || "AI Assessment Report"}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Completed on {mockSession.completed_at ? new Date(mockSession.completed_at).toLocaleDateString() : "N/A"}
                </CardDescription>
              </div>

              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 font-semibold ${
                  isPassed
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {isPassed ? `PASSED (${mockSession.overall_score || 0}% ≥ ${passThreshold}%) ✓` : `NEEDS IMPROVEMENT (${mockSession.overall_score || 0}% < ${passThreshold}%)`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Score Metrics Grid */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-2xl font-extrabold text-primary">{report?.overallScore ?? mockSession.overall_score ?? 0}%</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Overall Score</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{report?.mcqScore ?? mockSession.mcq_score ?? 0}%</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">MCQ Section</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{report?.theoryScore ?? mockSession.theory_score ?? 0}%</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Theory Section</div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{report?.codingScore ?? mockSession.coding_score ?? 0}%</div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">Coding Section</div>
              </div>
            </div>

            {/* AI Summary Feedback */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30 space-y-1">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <IconSparkles className="h-4 w-4 text-amber-500" />
                AI Assessment Summary
              </h4>
              <p className="text-zinc-600 dark:text-zinc-400">{report?.summary || mockSession.ai_summary}</p>
            </div>

            {/* Skill Score Breakdown */}
            {report?.skillScores && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Skill Proficiency Breakdown</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(report.skillScores).map(([skill, score]: [string, any]) => (
                    <div key={skill} className="rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>{skill}</span>
                        <span className="font-semibold text-primary">{score}%</span>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active Test View (ANSWERING)
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center gap-2">
          <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Test Navigation Header */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[10px]">
            {mockSession?.mock_type || "PRACTICE"}
          </Badge>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {mockSession?.job_role_context || "AI Mock Assessment"}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <span className="font-semibold text-primary">{answeredCount}</span> of{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalQuestions}</span> answered
          </div>

          <Button
            onClick={handleSubmitAssessment}
            disabled={submitting}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <IconCheck className="h-3.5 w-3.5" />
            {submitting ? "Evaluating Answers..." : "Submit Assessment"}
          </Button>
        </div>
      </div>

      {/* Question Stepper Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id])
          const isCurrent = idx === currentIdx

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : isAnswered
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      {/* Current Question Container */}
      {currentQ && (
        <div className="space-y-4">
          {currentQ.type === "MCQ" && (
            <QuestionnaireMCQ
              question={currentQ as any}
              selectedOptionId={answers[currentQ.id]?.selectedOptionId}
              onSelectOption={(optId) => handleMcqSelect(currentQ.id, optId)}
            />
          )}

          {(currentQ.type === "THEORY" || currentQ.type === "BEHAVIORAL") && (
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                    <IconFileText className="h-3 w-3 mr-1 inline" />
                    THEORY
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {currentQ.skill}
                  </Badge>
                </div>
                <span className="text-xs font-semibold text-zinc-500">{currentQ.points || 10} Points</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentQ.question}</h3>
              </div>

              <Textarea
                value={answers[currentQ.id]?.answerText || ""}
                onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                placeholder="Type your explanation and technical reasoning in detail..."
                className="min-h-[140px] text-xs resize-y"
              />
            </Card>
          )}

          {currentQ.type === "CODE" && (
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                    <IconCode className="h-3 w-3 mr-1 inline" />
                    CODING
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {currentQ.skill}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500">{currentQ.points || 15} Points</span>
                  <Select
                    value={answers[currentQ.id]?.codeLanguage || (currentQ as any).defaultLanguage || "TypeScript"}
                    onValueChange={(lang) => handleLanguageChange(currentQ.id, lang)}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {((currentQ as any).languageOptions || ["TypeScript", "JavaScript", "Python", "Java", "C++"]).map((l: string) => (
                        <SelectItem key={l} value={l} className="text-xs">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentQ.question}</h3>
                {(currentQ as any).description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{(currentQ as any).description}</p>
                )}
              </div>

              <Textarea
                value={answers[currentQ.id]?.answerText || (currentQ as any).starterCode || ""}
                onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                placeholder="Write your code implementation here..."
                className="min-h-[200px] font-mono text-xs leading-relaxed resize-y bg-zinc-950 text-zinc-100 border-zinc-800"
              />
            </Card>
          )}

          {/* Stepper Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="h-8 text-xs gap-1"
            >
              <IconArrowLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
              disabled={currentIdx === questions.length - 1}
              className="h-8 text-xs gap-1"
            >
              Next
              <IconArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
