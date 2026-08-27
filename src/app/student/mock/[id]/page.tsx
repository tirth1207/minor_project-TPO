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
  IconLoader2,
  IconRefresh,
  IconBrain,
} from "@tabler/icons-react"
import type { MockInterviewQuestion, StudentAnswer, MockEvaluationResult } from "@/types/mock-interview"

export default function StudentMockExecutionPage() {
  const params = useParams()
  const router = useRouter()
  const mockId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [processingState, setProcessingState] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [mockSession, setMockSession] = React.useState<any>(null)
  const [questions, setQuestions] = React.useState<MockInterviewQuestion[]>([])
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, StudentAnswer>>({})
  const [evaluationResult, setEvaluationResult] = React.useState<MockEvaluationResult | null>(null)

  // Canonical session fetcher (polling friendly)
  const fetchSession = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}`)
      const data = await res.json()

      if (res.ok && data.mock) {
        setMockSession(data.mock)
        const qs = Array.isArray(data.mock.questions) ? data.mock.questions : []
        setQuestions(qs)

        if (data.mock.status === "EVALUATED" && data.mock.ai_results) {
          setEvaluationResult(data.mock.ai_results)
        }

        // Initialize answers state from existing mock answers if present
        if (Array.isArray(data.mock.answers) && data.mock.answers.length > 0) {
          setAnswers((prev) => {
            const map: Record<string, StudentAnswer> = { ...prev }
            data.mock.answers.forEach((ans: StudentAnswer) => {
              if (ans.questionId) map[ans.questionId] = ans
            })
            return map
          })
        }
      } else {
        setError(data.error || "Failed to fetch assessment session.")
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading session.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [mockId])

  // Explicit process trigger endpoint call
  const triggerProcess = React.useCallback(async () => {
    setProcessingState(true)
    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}/process`, {
        method: "POST",
      })
      const data = await res.json()

      if (res.ok && data.mock) {
        setMockSession(data.mock)
        if (Array.isArray(data.mock.questions)) {
          setQuestions(data.mock.questions)
        }
      } else if (data.status === "FAILED") {
        setMockSession(data.mock)
        setError(data.error || "Generation failed. Please retry.")
      }
    } catch (err: any) {
      console.warn("Process trigger warning:", err?.message)
    } finally {
      setProcessingState(false)
    }
  }, [mockId])

  // Initial load
  React.useEffect(() => {
    if (mockId) fetchSession(false)
  }, [mockId, fetchSession])

  // Auto-polling effect for QUEUED, PROCESSING, or EVALUATING status
  React.useEffect(() => {
    if (!mockSession) return

    const status = mockSession.status

    // Trigger process immediately if QUEUED
    if (status === "QUEUED" && !processingState) {
      triggerProcess()
    }

    if (status === "QUEUED" || status === "PROCESSING" || status === "EVALUATING") {
      const interval = setInterval(() => {
        fetchSession(true)
      }, 2500)

      return () => clearInterval(interval)
    }
  }, [mockSession?.status, fetchSession, triggerProcess, processingState, mockSession])

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
    setSubmitting(true)
    setError(null)
    try {
      const answerList = Object.values(answers)
      const res = await fetch(`/api/students/mock-interviews/${mockId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerList }),
      })

      const data = await res.json()
      if (res.ok && data.result) {
        setEvaluationResult(data.result)
        setMockSession(data.mock)
      } else {
        setError(data.error || "Submission and evaluation failed. Your answers are saved, please retry evaluation.")
        if (data.mock) {
          setMockSession(data.mock)
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit assessment. Your answers are saved.")
    } finally {
      setSubmitting(false)
    }
  }

  // 1. Initial Page Load Spinner
  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-3">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-zinc-500">Initializing AI Assessment Session...</p>
      </div>
    )
  }

  if (error && !mockSession) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </div>
        <Link href="/student/mock">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Return to Mock Hub
          </Button>
        </Link>
      </div>
    )
  }

  const status = mockSession?.status || "QUEUED"

  // 2. QUEUED or PROCESSING State Loading View
  if (status === "QUEUED" || status === "PROCESSING") {
    const jobTitle = mockSession?.job_spec_snapshot?.title || mockSession?.job_role_context || "AI Assessment"
    const companyName = mockSession?.job_spec_snapshot?.companyName || "Corporate Partner"

    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
            <IconLoader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <IconSparkles className="h-3 w-3 mr-1 inline text-amber-500" />
              Preparing your AI assessment...
            </Badge>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {jobTitle}
            </h2>
            <p className="text-xs text-zinc-500">
              Company: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{companyName}</span>
            </p>
          </div>

          {/* Structured Progress Stages */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 text-left space-y-2.5 max-w-md mx-auto">
            <div className="flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <IconCheck className="h-4 w-4 shrink-0" />
              <span>1. Reading job specifications & role context</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <IconLoader2 className="h-4 w-4 animate-spin shrink-0" />
              <span>2. Building tailored question set (MCQ, Theory, Coding)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-zinc-400">
              <span className="h-4 w-4 flex items-center justify-center text-[10px] border rounded-full">3</span>
              <span>3. Validating assessment structure</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            This can take a few seconds. Do not close this page.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            <Button
              onClick={() => triggerProcess()}
              disabled={processingState}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${processingState ? "animate-spin text-primary" : ""}`} />
              Check Status / Process Now
            </Button>
            <Link href="/student/mock">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-zinc-500">
                Cancel
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 3. FAILED State View
  if (status === "FAILED") {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="rounded-2xl border-rose-200 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10 p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
            <IconAlertTriangle className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              AI Question Generation Failed
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
              {mockSession.ai_summary || "The AI service encountered a temporary error generating questions."}
            </p>
            <p className="text-[11px] text-zinc-500 pt-1">
              Your profile and assessment session are safe. You can safely retry generation.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => triggerProcess()}
              disabled={processingState}
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${processingState ? "animate-spin" : ""}`} />
              Retry Question Generation
            </Button>
            <Link href="/student/mock">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Return to Mock Hub
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 4. EVALUATING State View
  if (status === "EVALUATING" && !evaluationResult) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
            <IconLoader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              AI Assessment Evaluation in Progress...
            </h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Your answers have been safely recorded. The AI evaluator is calculating section scores, technical feedback, and overall placement readiness.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" onClick={handleSubmitAssessment} disabled={submitting} className="h-7 text-xs">
                Retry Evaluation
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={() => fetchSession(false)}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              Check Evaluation Status
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // 5. EVALUATED Report View
  if (status === "EVALUATED" || evaluationResult) {
    const report = evaluationResult || mockSession.ai_results
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
                Back to Jobs
              </Button>
            </Link>
          )}
        </div>

        {/* Score Header Card */}
        <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                {isPassed ? "PASSED ✓" : "NEEDS IMPROVEMENT"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Score Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
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

  // 6. Active Assessment Execution View (STRICT REQUIREMENT: status === "ANSWERING" && questions.length > 0)
  if (status !== "ANSWERING" || questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center space-y-4">
        <Card className="rounded-2xl border-amber-200 bg-amber-50/20 p-8 space-y-4">
          <IconBrain className="mx-auto h-8 w-8 text-amber-500" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Assessment Not Ready
          </h3>
          <p className="text-xs text-zinc-500">
            Questions are currently being generated for this session.
          </p>
          <Button onClick={() => triggerProcess()} size="sm" className="h-8 text-xs gap-1.5">
            <IconRefresh className="h-3.5 w-3.5" />
            Prepare Assessment
          </Button>
        </Card>
      </div>
    )
  }

  const currentQ = questions[currentIdx]
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" onClick={handleSubmitAssessment} disabled={submitting} className="h-7 text-xs">
            Retry Submit
          </Button>
        </div>
      )}

      {/* Top Test Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 gap-3">
        <div className="space-y-0.5">
          <Badge variant="outline" className="text-[10px]">
            {mockSession.mock_type || "PRACTICE"}
          </Badge>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {mockSession.job_role_context || "AI Mock Assessment"}
          </h2>
        </div>

        <div className="flex items-center gap-4 shrink-0">
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
              key={q.id || `q-${idx}`}
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
                    {currentQ.type}
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
                placeholder="Type your explanation and reasoning in detail..."
                className="min-h-[140px] text-xs resize-y"
              />
            </Card>
          )}

          {currentQ.type === "CODE" && (
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
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
