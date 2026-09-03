"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

import { QuestionnaireMCQ } from "@/components/mock-interview/questionnaire-mcq"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  IconArrowLeft,
  IconArrowRight,
  IconAlertTriangle,
  IconBrain,
  IconCheck,
  IconClock,
  IconCode,
  IconFileText,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react"
import type {
  MCQQuestion,
  MockEvaluationResult,
  MockInterviewQuestion,
  MockInterviewSession,
  StudentAnswer,
} from "@/types/mock-interview"

function isMCQQuestion(question: MockInterviewQuestion): question is MCQQuestion {
  return question.type === "MCQ"
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not yet available"
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatScore(value: number | null | undefined) {
  return `${Math.max(0, Math.min(100, Math.round(value ?? 0)))}%`
}

function formatThreshold(value: number | null | undefined) {
  return `${Math.max(0, Math.round(value ?? 0))}%`
}

function getStatusCopy(status?: string) {
  switch (status) {
    case "REQUESTED":
      return { label: "Requested", tone: "amber" }
    case "QUEUED":
      return { label: "Queued", tone: "amber" }
    case "PROCESSING":
      return { label: "Building questions", tone: "amber" }
    case "ANSWERING":
      return { label: "Ready to answer", tone: "slate" }
    case "EVALUATING":
      return { label: "Evaluating", tone: "amber" }
    case "EVALUATED":
      return { label: "Completed", tone: "emerald" }
    case "FAILED":
      return { label: "Failed", tone: "rose" }
    default:
      return { label: status || "Unknown", tone: "slate" }
  }
}

function toneClasses(tone: string) {
  switch (tone) {
    case "emerald":
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300"
    case "rose":
      return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300"
    case "amber":
      return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300"
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
  }
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-zinc-900 dark:text-zinc-100"
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  )
}

function AnswerPreview({ answer }: { answer?: StudentAnswer }) {
  if (!answer) {
    return <span className="text-zinc-400">Not answered</span>
  }

  if (answer.selectedOptionId) {
    return <span className="font-medium text-zinc-700 dark:text-zinc-300">Selected option: {answer.selectedOptionId}</span>
  }

  const text = answer.answerText?.trim()
  if (!text) {
    return <span className="text-zinc-400">Not answered</span>
  }

  return <span className="text-zinc-600 dark:text-zinc-400">{text.length > 120 ? `${text.slice(0, 120)}...` : text}</span>
}

export default function StudentMockExecutionPage() {
  const params = useParams()
  const mockId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [processing, setProcessing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mockSession, setMockSession] = React.useState<MockInterviewSession | null>(null)
  const [questions, setQuestions] = React.useState<MockInterviewQuestion[]>([])
  const [currentIdx, setCurrentIdx] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, StudentAnswer>>({})
  const [evaluationResult, setEvaluationResult] = React.useState<MockEvaluationResult | null>(null)

  const processInterview = React.useCallback(async () => {
    if (!mockId) return

    setProcessing(true)
    setError(null)

    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}/process`, {
        method: "POST",
      })
      const json = await res.json()
      const mockData = json.data?.mock || json.mock

      if (!res.ok || !mockData) {
        setError(json.error || "Failed to process interview generation.")
        return
      }

      const session = mockData as MockInterviewSession
      setMockSession(session)

      if (Array.isArray(session.questions) && session.questions.length > 0) {
        setQuestions(session.questions)
        setCurrentIdx((previous) => (previous < session.questions.length ? previous : 0))
      }

      if (session.status === "FAILED") {
        setError(json.error || "Question generation failed. Please retry.")
      }
    } catch (processError) {
      console.error("[Mock Page] Processing error:", processError)
      setError(processError instanceof Error ? processError.message : "An unexpected error occurred during processing.")
    } finally {
      setProcessing(false)
    }
  }, [mockId])

  const loadMockSession = React.useCallback(async () => {
    if (!mockId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}`)
      const json = await res.json()
      const mockData = json.data?.mock || json.mock

      if (!res.ok || !mockData) {
        setError(json.error || "Failed to fetch mock interview session.")
        return
      }

      const session = mockData as MockInterviewSession
      setMockSession(session)

      const qs = Array.isArray(session.questions) ? session.questions : []
      setQuestions(qs)
      setCurrentIdx((previous) => (qs.length > 0 && previous < qs.length ? previous : 0))

      if (session.status === "EVALUATED" && session.ai_results) {
        setEvaluationResult(session.ai_results)
      }

      if (Array.isArray(session.answers)) {
        const mapped: Record<string, StudentAnswer> = {}
        session.answers.forEach((answer) => {
          if (answer?.questionId) {
            mapped[answer.questionId] = answer
          }
        })
        setAnswers(mapped)
      }

      if (["QUEUED", "REQUESTED"].includes(session.status)) {
        void processInterview()
      }
    } catch (loadError) {
      console.error("[Mock Page] Session loading error:", loadError)
      setError(loadError instanceof Error ? loadError.message : "Failed to load session.")
    } finally {
      setLoading(false)
    }
  }, [mockId, processInterview])

  React.useEffect(() => {
    if (mockId) {
      void loadMockSession()
    }
  }, [mockId, loadMockSession])

  React.useEffect(() => {
    const status = mockSession?.status
    if (!status || !["QUEUED", "PROCESSING", "REQUESTED"].includes(status)) return

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/students/mock-interviews/${mockId}`)
        const json = await res.json()
        const mockData = json.data?.mock || json.mock

        if (!res.ok || !mockData) return

        const session = mockData as MockInterviewSession
        setMockSession(session)

        if (Array.isArray(session.questions) && session.questions.length > 0) {
          setQuestions(session.questions)
          setCurrentIdx((previous) => (previous < session.questions.length ? previous : 0))
        }

        if (["ANSWERING", "EVALUATED", "FAILED"].includes(session.status)) {
          window.clearInterval(timer)
        }
      } catch (pollError) {
        console.error("[Mock Page] Polling error:", pollError)
      }
    }, 2500)

    return () => window.clearInterval(timer)
  }, [mockId, mockSession?.status])

  const currentQ = React.useMemo(() => {
    if (!questions.length) return undefined
    return questions[Math.min(currentIdx, questions.length - 1)]
  }, [currentIdx, questions])

  const answeredCount = React.useMemo(() => Object.keys(answers).length, [answers])
  const totalQuestions = questions.length
  const progressValue = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  const currentAnswer = currentQ ? answers[currentQ.id] : undefined
  const sessionStatus = getStatusCopy(mockSession?.status)
  const report = evaluationResult || mockSession?.ai_results || null
  const isJobRequired = mockSession?.mock_type === "JOB_REQUIRED"
  const passThreshold = mockSession?.job_spec_snapshot?.mockPassScore || 70
  const isPassed = Boolean(mockSession?.passed ?? report?.passed)
  const questionEvaluations = report?.questionEvaluations || []

  const submitAssessment = async () => {
    if (submitting || !mockId) return

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
      const nextMock = json.data?.mock || json.mock

      if (!res.ok || !nextMock) {
        setError(json.error || "Submission and evaluation failed.")
        return
      }

      setMockSession(nextMock as MockInterviewSession)
      setEvaluationResult((json.data?.result || json.result || (nextMock as MockInterviewSession).ai_results) as MockEvaluationResult)
    } catch (submitError) {
      console.error("[Mock Page] Submission error:", submitError)
      setError(submitError instanceof Error ? submitError.message : "Failed to submit assessment.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] w-full items-center justify-center">
        <div className="rounded-3xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <IconBrain className="mx-auto h-10 w-10 animate-pulse text-primary" />
          <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Loading your mock interview studio...
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            We are restoring your session, questions, and score state.
          </p>
        </div>
      </div>
    )
  }

  if (error && !mockSession) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl space-y-4 text-center">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
            {error || "Assessment session unavailable or access forbidden."}
          </div>
          <Link href="/student/mock">
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs">
              Return to Mock Hub
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (mockSession && ["QUEUED", "PROCESSING", "REQUESTED"].includes(mockSession.status)) {
    const generationActive = processing || mockSession.status === "PROCESSING"

    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader className="space-y-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${toneClasses(sessionStatus.tone)}`}>
                  {sessionStatus.label}
                </Badge>
                <Link href="/student/mock">
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl px-3 text-xs text-zinc-500">
                    <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                    Back
                  </Button>
                </Link>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {mockSession.job_role_context || "AI Mock Assessment"}
                </CardTitle>
                <CardDescription className="text-xs leading-6">
                  Your assessment is being prepared. The AI will generate a balanced mix of MCQ, theory, and coding prompts tailored to the target role.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Mock type" value={isJobRequired ? "Job-required" : "Practice"} helper="Session category" />
                <StatCard label="Questions" value={String(mockSession.questions?.length || 0)} helper="Will appear once generation completes" />
                <StatCard label="Status" value={sessionStatus.label} helper="Current queue state" />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <IconSparkles className="h-4 w-4 text-primary" />
                  Generation pipeline
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {["Request received", "Question generation", "Ready to answer"].map((step, index) => {
                    const isCurrent = generationActive && index === 1
                    const isDone = index === 0 || (mockSession.status === "ANSWERING" && index < 2)

                    return (
                      <div key={step} className="space-y-2">
                        <div className={`h-1.5 rounded-full ${isDone || isCurrent ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-800"} ${isCurrent ? "animate-pulse" : ""}`} />
                        <p className="text-[11px] font-medium text-zinc-500">{step}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">What happens next</p>
                <p className="mt-2 text-xs leading-6 text-zinc-500">
                  The session usually becomes ready within a minute. You can keep this page open while the AI finishes generating the interview.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                    MCQ
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                    Theory
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                    Coding
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs">
                  <IconClock className="mr-1 h-3.5 w-3.5" />
                  Stay on this page
                </Button>
                <Link href="/student/mock">
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs text-zinc-500">
                    Return later
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Session snapshot</CardTitle>
              <CardDescription className="text-xs">
                Job context and threshold details are locked in this mock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Role</p>
                <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {mockSession.job_spec_snapshot?.role || mockSession.job_role_context}
                </p>
                {mockSession.job_spec_snapshot?.companyName && (
                  <p className="mt-1 text-xs text-zinc-500">{mockSession.job_spec_snapshot.companyName}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Pass threshold" value={formatThreshold(passThreshold)} helper="Job-specific score gate" />
                <StatCard label="Attempts" value={String(mockSession.attempt_number || 1)} helper="Current retry number" />
              </div>
              <div className="space-y-2 text-xs text-zinc-500">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">Focus areas</p>
                <div className="flex flex-wrap gap-2">
                  {(mockSession.job_spec_snapshot?.skills || []).slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="leading-6">
                  {mockSession.job_spec_snapshot?.description || "The AI will tailor the interview to the stored job context and placement requirements."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (mockSession && mockSession.status === "FAILED") {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl">
          <Card className="rounded-3xl border-rose-200 shadow-sm dark:border-rose-900/50">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-medium ${toneClasses(sessionStatus.tone)}`}>
                {sessionStatus.label}
              </Badge>
              <CardTitle className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Question generation failed
              </CardTitle>
              <CardDescription className="text-xs leading-6">
                The AI could not build this assessment right now. Your request is still saved in the session, and you can retry generation without losing the interview record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
                <div className="flex items-start gap-2">
                  <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error || "We encountered an issue generating your assessment questions. Please retry generation."}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  onClick={() => void processInterview()}
                  disabled={processing}
                  className="h-9 rounded-xl text-xs font-medium"
                >
                  <IconRefresh className={`mr-1 h-3.5 w-3.5 ${processing ? "animate-spin" : ""}`} />
                  {processing ? "Retrying..." : "Retry question generation"}
                </Button>
                <Link href="/student/mock">
                  <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs font-medium">
                    Back to Mock Hub
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (mockSession?.status === "EVALUATED" || report) {
    const overallScore = report?.overallScore ?? mockSession?.overall_score ?? 0
    const mcqScore = report?.mcqScore ?? mockSession?.mcq_score ?? 0
    const theoryScore = report?.theoryScore ?? mockSession?.theory_score ?? 0
    const codingScore = report?.codingScore ?? mockSession?.coding_score ?? 0
    const strengths = report?.strengths || []
    const improvements = report?.improvements || []
    const nextSteps = report?.recommendedNextSteps || []

    return (
      <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/student/mock">
            <Button variant="ghost" size="sm" className="h-9 rounded-xl px-3 text-xs text-zinc-500">
              <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
              Mock hub
            </Button>
          </Link>
          {mockSession?.job_college_mapping_id && (
            <Link href="/student/jobs">
              <Button variant="outline" size="sm" className="h-9 rounded-xl px-3 text-xs font-medium">
                Back to campus jobs
              </Button>
            </Link>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader className="space-y-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${toneClasses(sessionStatus.tone)}`}>
                  {sessionStatus.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${isPassed ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300" : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/35 dark:text-rose-300"}`}
                >
                  {isPassed ? "Passed" : "Needs improvement"}
                </Badge>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {mockSession?.job_role_context || "AI Assessment Report"}
                </CardTitle>
                <CardDescription className="text-xs leading-6">
                  Completed on {formatDateTime(mockSession?.completed_at)}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Overall</p>
                  <p className={`mt-2 text-3xl font-semibold tracking-tight ${scoreTone(overallScore)}`}>{formatScore(overallScore)}</p>
                </div>
                <StatCard label="MCQ" value={formatScore(mcqScore)} helper="Objective accuracy" />
                <StatCard label="Theory" value={formatScore(theoryScore)} helper="Concept clarity" />
                <StatCard label="Coding" value={formatScore(codingScore)} helper="Implementation quality" />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <IconSparkles className="h-4 w-4 text-primary" />
                  AI summary
                </div>
                <p className="mt-2 text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                  {report?.summary || mockSession?.ai_summary || "No summary available for this attempt."}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Skill proficiency</h3>
                  <p className="text-xs text-zinc-500">Based on your evaluated answers</p>
                </div>
                {report?.skillScores && Object.keys(report.skillScores).length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(report.skillScores).map(([skill, score]) => (
                      <div key={skill} className="space-y-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{skill}</span>
                          <span className={`font-semibold ${scoreTone(score)}`}>{formatScore(score)}</span>
                        </div>
                        <Progress value={score} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center text-xs text-zinc-500 dark:border-zinc-800">
                    No skill breakdown was returned for this attempt.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">Strengths</p>
                  <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {strengths.length > 0 ? strengths.map((item) => <li key={item}>- {item}</li>) : <li>No strengths were returned.</li>}
                  </ul>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">Improve next</p>
                  <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {improvements.length > 0 ? improvements.map((item) => <li key={item}>- {item}</li>) : <li>No improvement list was returned.</li>}
                  </ul>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">Next steps</p>
                  <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {nextSteps.length > 0 ? nextSteps.map((item) => <li key={item}>- {item}</li>) : <li>No next-step guidance was returned.</li>}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Session details</CardTitle>
              <CardDescription className="text-xs leading-6">
                Everything that defines this assessment at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Job context</p>
                <p className="mt-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {mockSession?.job_spec_snapshot?.title || mockSession?.job_role_context}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {mockSession?.job_spec_snapshot?.companyName || "Practice session"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Threshold" value={formatThreshold(passThreshold)} helper="Passing score required" />
                <StatCard label="Attempt" value={String(mockSession?.attempt_number || 1)} helper="Saved retry number" />
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Prompt focus</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(mockSession?.job_spec_snapshot?.skills || []).slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                {mockSession?.job_spec_snapshot?.description || "The AI generated this session from the stored mock context and job requirements."}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="border-b border-zinc-100 pb-5 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold">Question-by-question review</CardTitle>
            <CardDescription className="text-xs leading-6">
              The report below maps each generated question to your answer, score, and feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {questionEvaluations.length > 0 ? (
              questionEvaluations.map((evaluation) => {
                const question = questions.find((item) => item.id === evaluation.questionId)
                const answer = answers[evaluation.questionId]
                const questionType = question?.type || evaluation.type

                return (
                  <div key={evaluation.questionId} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                            {questionType}
                          </Badge>
                          <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${evaluation.verdict === "strong" ? toneClasses("emerald") : evaluation.verdict === "partial" ? toneClasses("amber") : toneClasses("rose")}`}>
                            {evaluation.verdict}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {question?.question || "Question no longer available"}
                        </p>
                        <div className="space-y-1 text-xs text-zinc-500">
                          <p><span className="font-medium text-zinc-700 dark:text-zinc-300">Your answer: </span><AnswerPreview answer={answer} /></p>
                          <p>{evaluation.feedback}</p>
                        </div>
                      </div>

                      <div className="grid min-w-[220px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Score</p>
                          <p className={`mt-1 text-2xl font-semibold ${scoreTone(evaluation.pointsEarned > 0 ? Math.round((evaluation.pointsEarned / Math.max(1, evaluation.pointsPossible)) * 100) : 0)}`}>
                            {evaluation.pointsEarned}/{evaluation.pointsPossible}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Type</p>
                          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{questionType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30">
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">Strengths</p>
                        <ul className="mt-2 space-y-1 text-zinc-500">
                          {evaluation.strengths.length > 0 ? evaluation.strengths.map((item) => <li key={item}>- {item}</li>) : <li>No strengths captured.</li>}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30">
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">Improvements</p>
                        <ul className="mt-2 space-y-1 text-zinc-500">
                          {evaluation.improvements.length > 0 ? evaluation.improvements.map((item) => <li key={item}>- {item}</li>) : <li>No improvements captured.</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
                A detailed per-question review was not returned for this attempt.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQ) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[320px] max-w-xl flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <IconBrain className="h-10 w-10 animate-pulse text-primary" />
          <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Preparing your assessment...
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            The question set will appear as soon as generation completes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="space-y-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${toneClasses(sessionStatus.tone)}`}>
                {sessionStatus.label}
              </Badge>
              <Link href="/student/mock">
                <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2 text-xs text-zinc-500">
                  <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Hub
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {mockSession?.job_role_context || "AI Mock Assessment"}
              </CardTitle>
              <CardDescription className="text-xs leading-6">
                {mockSession?.mock_type || "PRACTICE"} - question {currentIdx + 1} of {totalQuestions}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard label="Answered" value={`${answeredCount}/${totalQuestions}`} helper="Saved responses so far" />
              <StatCard label="Progress" value={`${Math.round(progressValue)}%`} helper="Completion toward submission" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Question navigator</span>
                <span className="text-zinc-500">Click to jump</span>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 xl:grid-cols-4">
                {questions.map((question, index) => {
                  const isCurrent = index === currentIdx
                  const isAnswered = Boolean(answers[question.id])

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setCurrentIdx(index)}
                      className={`relative flex h-10 items-center justify-center rounded-2xl border text-xs font-medium transition-all duration-200 ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : isAnswered
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Need a reminder?</p>
              <p className="mt-2 leading-6">
                Work through each question at your pace. Saved answers stay in the session until you submit.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader className="space-y-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                    {mockSession?.mock_type || "PRACTICE"}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                    {currentQ.type}
                  </Badge>
                  {isMCQQuestion(currentQ) ? (
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      <IconCheck className="mr-1 h-3 w-3" />
                      One answer
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      <IconFileText className="mr-1 h-3 w-3" />
                      Written response
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => void submitAssessment()}
                  disabled={submitting}
                  size="sm"
                  className="h-9 rounded-xl px-4 text-xs font-medium"
                >
                  <IconCheck className="mr-1 h-3.5 w-3.5" />
                  {submitting ? "Evaluating answers..." : "Submit assessment"}
                </Button>
              </div>

              <div className="space-y-2">
                <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {currentQ.question}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {currentQ.skill && (
                    <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      {currentQ.skill}
                    </Badge>
                  )}
                  {currentQ.points && (
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                      {currentQ.points} points
                    </Badge>
                  )}
                  {currentQ.type !== "CODE" && "expectedTopics" in currentQ && Array.isArray(currentQ.expectedTopics) && currentQ.expectedTopics.length > 0 && (
                    currentQ.expectedTopics.slice(0, 4).map((topic) => (
                      <Badge key={topic} variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                        {topic}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              {isMCQQuestion(currentQ) && (
                <QuestionnaireMCQ
                  question={currentQ}
                  selectedOptionId={currentAnswer?.selectedOptionId}
                  onSelectOption={(optionId) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [currentQ.id]: {
                        questionId: currentQ.id,
                        selectedOptionId: optionId,
                      },
                    }))
                  }
                />
              )}

              {!isMCQQuestion(currentQ) && currentQ.type !== "CODE" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <IconFileText className="h-4 w-4 text-primary" />
                      Response guidance
                    </div>
                    <p className="mt-2 text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                      Explain the concept clearly, mention trade-offs where relevant, and keep your answer structured.
                    </p>
                    {"expectedTopics" in currentQ && Array.isArray(currentQ.expectedTopics) && currentQ.expectedTopics.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {currentQ.expectedTopics.map((topic) => (
                          <Badge key={topic} variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={currentAnswer?.answerText || ""}
                    onChange={(event) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [currentQ.id]: {
                          ...previous[currentQ.id],
                          questionId: currentQ.id,
                          answerText: event.target.value,
                        },
                      }))
                    }
                    placeholder="Type your explanation in a clear, structured way..."
                    className="min-h-[220px] rounded-2xl text-sm"
                  />
                </div>
              )}

              {currentQ.type === "CODE" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <IconCode className="h-4 w-4 text-primary" />
                      Coding prompt
                    </div>
                    {currentQ.description && (
                      <p className="mt-2 text-xs leading-6 text-zinc-600 dark:text-zinc-400">{currentQ.description}</p>
                    )}
                    {currentQ.constraints && currentQ.constraints.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Constraints</p>
                        <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {currentQ.constraints.map((constraint) => (
                            <li key={constraint}>- {constraint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {currentQ.examples && currentQ.examples.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {currentQ.examples.map((example, index) => (
                        <div key={`${example.input}-${index}`} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Example {index + 1}</p>
                          <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="font-medium">Input: </span>
                            {example.input}
                          </p>
                          <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="font-medium">Output: </span>
                            {example.output}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Select
                      value={currentAnswer?.codeLanguage || currentQ.defaultLanguage || "TypeScript"}
                      onValueChange={(language) =>
                        setAnswers((previous) => {
                          const selectedLanguage = language ?? "TypeScript"
                          const previousAnswer = previous[currentQ.id] ?? { questionId: currentQ.id }
                          const nextAnswer: StudentAnswer = {
                            ...previousAnswer,
                            questionId: currentQ.id,
                            codeLanguage: selectedLanguage,
                          }

                          return {
                            ...previous,
                            [currentQ.id]: nextAnswer,
                          }
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(currentQ.languageOptions || ["TypeScript", "JavaScript", "Python", "Java", "C++"]).map((language) => (
                          <SelectItem key={language} value={language} className="text-xs">
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-zinc-500">
                      Pick the language you want the evaluator to score against.
                    </div>
                  </div>

                  <Textarea
                    value={currentAnswer?.answerText || ""}
                    onChange={(event) =>
                      setAnswers((previous) => {
                        const previousAnswer = previous[currentQ.id] ?? { questionId: currentQ.id }
                        const nextAnswer: StudentAnswer = {
                          ...previousAnswer,
                          questionId: currentQ.id,
                          answerText: event.target.value,
                        }

                        return {
                          ...previous,
                          [currentQ.id]: nextAnswer,
                        }
                      })
                    }
                    placeholder="Paste your solution or explain your approach in detail..."
                    className="min-h-[260px] rounded-2xl font-mono text-sm"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <div className="text-xs text-zinc-500">
                  <span className="font-semibold text-primary">{answeredCount}</span> of {totalQuestions} answered
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl px-4 text-xs font-medium"
                    onClick={() => setCurrentIdx((previous) => Math.max(0, previous - 1))}
                    disabled={currentIdx === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 rounded-xl px-4 text-xs font-medium"
                    onClick={() => setCurrentIdx((previous) => Math.min(totalQuestions - 1, previous + 1))}
                    disabled={currentIdx >= totalQuestions - 1}
                  >
                    Next
                    <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <IconClock className="h-4 w-4 text-primary" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Progress</span>
            </div>
            <Progress value={progressValue} className="mt-3 h-1.5" />
            <p className="mt-3 leading-6">
              Your answers are preserved locally in this session until you submit the assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
