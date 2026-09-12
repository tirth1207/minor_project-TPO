"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

import { QuestionnaireMCQ } from "@/components/mock-interview/questionnaire-mcq"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBrain,
  IconCircleCheck,
  IconClock,
  IconCode,
  IconFileText,
  IconRefresh,
  IconSparkles,
  IconTarget,
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
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function formatScore(value: number | null | undefined) {
  return `${Math.max(0, Math.min(100, Math.round(value ?? 0)))}%`
}

function formatThreshold(value: number | null | undefined) {
  return `${Math.max(0, Math.round(value ?? 0))}%`
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-zinc-900 dark:text-zinc-100"
}

function scoreSurface(score: number) {
  if (score >= 80) return "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20"
  if (score >= 60) return "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20"
  return "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/30"
}

function statusClasses(passed: boolean) {
  return passed
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300"
    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300"
}

function verdictClasses(verdict?: string) {
  if (verdict === "strong") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300"
  if (verdict === "partial") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300"
  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300"
}

function getStatusCopy(status?: string) {
  switch (status) {
    case "REQUESTED": return "Requested"
    case "QUEUED": return "Queued"
    case "PROCESSING": return "Building questions"
    case "ANSWERING": return "Ready to answer"
    case "EVALUATING": return "Evaluating"
    case "EVALUATED": return "Completed"
    case "FAILED": return "Failed"
    default: return status || "Unknown"
  }
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>
    </div>
  )
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-xs text-zinc-500">{empty}</p>
  return (
    <ul className="space-y-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current opacity-50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function AnswerPreview({ answer }: { answer?: StudentAnswer }) {
  if (!answer) return <span className="text-zinc-400">Not answered</span>
  if (answer.selectedOptionId) return <span>{answer.selectedOptionId}</span>
  const text = answer.answerText?.trim()
  if (!text) return <span className="text-zinc-400">Not answered</span>
  return <span>{text}</span>
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
      const res = await fetch(`/api/students/mock-interviews/${mockId}/process`, { method: "POST" })
      const json = await res.json()
      const mockData = json.data?.mock || json.mock
      if (!res.ok || !mockData) {
        setError(json.error || "Failed to process interview generation.")
        return
      }
      const session = mockData as MockInterviewSession
      setMockSession(session)
      if (Array.isArray(session.questions) && session.questions.length) {
        setQuestions(session.questions)
        setCurrentIdx((previous) => (previous < session.questions.length ? previous : 0))
      }
      if (session.status === "FAILED") setError(json.error || "Question generation failed. Please retry.")
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
      if (session.status === "EVALUATED" && session.ai_results) setEvaluationResult(session.ai_results)
      if (Array.isArray(session.answers)) {
        const mapped: Record<string, StudentAnswer> = {}
        session.answers.forEach((answer) => {
          if (answer?.questionId) mapped[answer.questionId] = answer
        })
        setAnswers(mapped)
      }
      if (["QUEUED", "REQUESTED"].includes(session.status)) void processInterview()
    } catch (loadError) {
      console.error("[Mock Page] Session loading error:", loadError)
      setError(loadError instanceof Error ? loadError.message : "Failed to load session.")
    } finally {
      setLoading(false)
    }
  }, [mockId, processInterview])

  React.useEffect(() => {
    if (mockId) void loadMockSession()
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
        if (Array.isArray(session.questions) && session.questions.length) setQuestions(session.questions)
        if (["ANSWERING", "EVALUATED", "FAILED"].includes(session.status)) window.clearInterval(timer)
      } catch (pollError) {
        console.error("[Mock Page] Polling error:", pollError)
      }
    }, 2500)
    return () => window.clearInterval(timer)
  }, [mockId, mockSession?.status])

  const currentQ = React.useMemo(() => questions.length ? questions[Math.min(currentIdx, questions.length - 1)] : undefined, [currentIdx, questions])
  const answeredCount = Object.keys(answers).length
  const totalQuestions = questions.length
  const progressValue = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined
  const report = evaluationResult || mockSession?.ai_results || null
  const passThreshold = mockSession?.job_spec_snapshot?.mockPassScore || 70
  const isPassed = Boolean(mockSession?.passed ?? report?.passed)
  const questionEvaluations = report?.questionEvaluations || []
  const sessionStatus = getStatusCopy(mockSession?.status)

  const submitAssessment = async () => {
    if (submitting || !mockId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/mock-interviews/${mockId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: Object.values(answers) }),
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
      <div className="flex min-h-[420px] w-full items-center justify-center px-4">
        <div className="rounded-3xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <IconBrain className="mx-auto h-9 w-9 animate-pulse text-primary" />
          <p className="mt-4 text-sm font-medium">Loading your mock interview...</p>
          <p className="mt-1 text-xs text-zinc-500">Restoring your questions, answers, and score.</p>
        </div>
      </div>
    )
  }

  if (error && !mockSession) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">{error}</div>
          <Link href="/student/mock"><Button variant="outline" className="rounded-xl">Return to Mock Hub</Button></Link>
        </div>
      </div>
    )
  }

  if (mockSession && ["QUEUED", "PROCESSING", "REQUESTED"].includes(mockSession.status)) {
    return (
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl">
            <CardHeader className="border-b pb-5">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline" className="rounded-full">{sessionStatus}</Badge>
                <Link href="/student/mock"><Button variant="ghost" size="sm" className="rounded-xl"><IconArrowLeft className="mr-1 size-3.5" />Back</Button></Link>
              </div>
              <CardTitle className="text-2xl">{mockSession.job_role_context || "AI Mock Assessment"}</CardTitle>
              <CardDescription className="leading-6">Your assessment is being prepared. The AI is generating a balanced set of interview questions for this role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Type" value={mockSession.mock_type === "JOB_REQUIRED" ? "Job-required" : "Practice"} helper="Session category" />
                <StatCard label="Questions" value={String(mockSession.questions?.length || 0)} helper="Appears after generation" />
                <StatCard label="Status" value={sessionStatus} helper="Current session state" />
              </div>
              <div className="rounded-2xl border bg-muted/30 p-5">
                <div className="flex items-center gap-2 text-sm font-medium"><IconSparkles className="size-4 text-primary" />Preparing your assessment</div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">Question generation can take a little time. This page will update automatically when the session is ready.</p>
                <Progress value={mockSession.status === "PROCESSING" || processing ? 65 : 25} className="mt-4 h-1.5" />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-sm">Session snapshot</CardTitle><CardDescription>Context locked into this mock.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Role</p><p className="mt-1 font-semibold">{mockSession.job_spec_snapshot?.role || mockSession.job_role_context}</p>{mockSession.job_spec_snapshot?.companyName && <p className="mt-1 text-xs text-muted-foreground">{mockSession.job_spec_snapshot.companyName}</p>}</div>
              <div className="grid gap-3 sm:grid-cols-2"><StatCard label="Threshold" value={formatThreshold(passThreshold)} helper="Passing score" /><StatCard label="Attempt" value={String(mockSession.attempt_number || 1)} helper="Current retry" /></div>
              <div><p className="text-xs font-medium">Focus areas</p><div className="mt-2 flex flex-wrap gap-2">{(mockSession.job_spec_snapshot?.skills || []).slice(0, 6).map((skill) => <Badge key={skill} variant="secondary" className="rounded-full">{skill}</Badge>)}</div></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (mockSession?.status === "FAILED") {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-xl"><Card className="rounded-3xl border-rose-200 dark:border-rose-900/50"><CardHeader><Badge variant="outline" className="w-fit rounded-full border-rose-200 text-rose-700">Failed</Badge><CardTitle>Question generation failed</CardTitle><CardDescription className="leading-6">Your interview request is still saved. Retry generation without losing the session.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><IconAlertTriangle className="mt-0.5 size-4 shrink-0" />{error || "We could not generate the assessment right now."}</div><div className="flex flex-wrap gap-2"><Button onClick={() => void processInterview()} disabled={processing} className="rounded-xl"><IconRefresh className="mr-1 size-4" />{processing ? "Retrying..." : "Retry generation"}</Button><Link href="/student/mock"><Button variant="outline" className="rounded-xl">Back to Mock Hub</Button></Link></div></CardContent></Card></div></div>
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
      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/student/mock"><Button variant="ghost" size="sm" className="rounded-xl px-2 text-xs text-muted-foreground"><IconArrowLeft className="mr-1 size-3.5" />Mock hub</Button></Link>
            <div className="flex items-center gap-2">
              {mockSession?.job_college_mapping_id && <Link href="/student/jobs"><Button variant="outline" size="sm" className="rounded-xl text-xs">Campus jobs</Button></Link>}
              <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses(isPassed)}`}><IconCircleCheck className="mr-1 size-3.5" />{isPassed ? "Passed" : "Needs improvement"}</Badge>
            </div>
          </div>

          <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <Card className="overflow-hidden rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
              <CardContent className="p-0">
                <div className="border-b border-zinc-100 p-5 sm:p-7 dark:border-zinc-800">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Interview result</p>
                      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{mockSession?.job_role_context || "AI Mock Assessment"}</h1>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Completed {formatDateTime(mockSession?.completed_at)} · Attempt {mockSession?.attempt_number || 1}</p>
                    </div>
                    <div className={`flex min-w-[150px] items-center gap-4 rounded-2xl border p-4 ${scoreSurface(overallScore)}`}>
                      <div><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Overall</p><p className={`mt-1 text-4xl font-semibold tracking-tight ${scoreTone(overallScore)}`}>{formatScore(overallScore)}</p></div>
                      <div className="ml-auto text-right"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Threshold</p><p className="mt-1 text-sm font-semibold">{formatThreshold(passThreshold)}</p></div>
                    </div>
                  </div>
                  <div className="mt-5"><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Assessment score</span><span>{overallScore >= passThreshold ? "Passing" : `${Math.max(0, passThreshold - overallScore)} points to pass`}</span></div><Progress value={overallScore} className="mt-2 h-2" /></div>
                </div>
                <div className="grid gap-px bg-zinc-100 sm:grid-cols-3 dark:bg-zinc-800">
                  {[["MCQ", mcqScore, "Objective accuracy"], ["Theory", theoryScore, "Concept clarity"], ["Coding", codingScore, "Implementation quality"]].map(([label, value, helper]) => (
                    <div key={String(label)} className="bg-white p-5 dark:bg-zinc-950"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold ${scoreTone(Number(value))}`}>{formatScore(Number(value))}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><IconTarget className="size-4 text-primary" />Session details</CardTitle><CardDescription className="text-xs">The context used for this assessment.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl bg-muted/40 p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Job context</p><p className="mt-1 text-sm font-semibold">{mockSession?.job_spec_snapshot?.title || mockSession?.job_role_context || "Practice session"}</p><p className="mt-1 text-xs text-muted-foreground">{mockSession?.job_spec_snapshot?.companyName || "Practice interview"}</p></div>
                <div className="grid grid-cols-2 gap-3"><StatCard label="Threshold" value={formatThreshold(passThreshold)} helper="Required" /><StatCard label="Attempt" value={String(mockSession?.attempt_number || 1)} helper="Saved number" /></div>
                {(mockSession?.job_spec_snapshot?.skills || []).length > 0 && <div className="rounded-2xl bg-muted/40 p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Focus</p><div className="mt-2 flex flex-wrap gap-1.5">{(mockSession.job_spec_snapshot?.skills || []).slice(0, 8).map((skill) => <Badge key={skill} variant="secondary" className="rounded-full text-[10px]">{skill}</Badge>)}</div></div>}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><IconSparkles className="size-4 text-primary" />AI summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-7 text-muted-foreground">{report?.summary || mockSession?.ai_summary || "No summary available for this attempt."}</p></CardContent></Card>
            <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800"><CardHeader className="pb-3"><CardTitle className="text-sm">Skill proficiency</CardTitle><CardDescription className="text-xs">Based on evaluated answers.</CardDescription></CardHeader><CardContent className="space-y-3">{report?.skillScores && Object.keys(report.skillScores).length > 0 ? Object.entries(report.skillScores).map(([skill, score]) => <div key={skill}><div className="flex items-center justify-between text-xs"><span className="font-medium">{skill}</span><span className={`font-semibold ${scoreTone(score)}`}>{formatScore(score)}</span></div><Progress value={score} className="mt-1.5 h-1.5" /></div>) : <p className="text-xs text-muted-foreground">No skill breakdown was returned.</p>}</CardContent></Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[["Strengths", strengths, "What went well"], ["Improve next", improvements, "Highest-value gaps"], ["Next steps", nextSteps, "Recommended practice"]].map(([title, items, helper]) => <Card key={String(title)} className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800"><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle><CardDescription className="text-xs">{helper}</CardDescription></CardHeader><CardContent><BulletList items={items as string[]} empty="Nothing was returned for this section." /></CardContent></Card>)}
          </section>

          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800"><CardTitle className="text-sm">Question review</CardTitle><CardDescription className="text-xs leading-5">Open a question to see your answer, score, feedback, strengths, and improvements.</CardDescription></CardHeader>
            <CardContent className="p-3 sm:p-4">
              {questionEvaluations.length > 0 ? (
                <Accordion defaultValue={["question-0"]} className="w-full">
                  {questionEvaluations.map((evaluation, index) => {
                    const question = questions.find((item) => item.id === evaluation.questionId)
                    const answer = answers[evaluation.questionId]
                    const questionType = question?.type || evaluation.type
                    const questionScore = evaluation.pointsPossible > 0 ? Math.round((evaluation.pointsEarned / evaluation.pointsPossible) * 100) : 0
                    return (
                      <AccordionItem key={evaluation.questionId} value={`question-${index}`} className="border-b-0">
                        <div className="mb-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors dark:border-zinc-800 dark:bg-zinc-950">
                          <AccordionTrigger className="px-4 py-4 hover:no-underline sm:px-5">
                            <div className="flex min-w-0 items-center gap-3 pr-2">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold">{index + 1}</span>
                              <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><Badge variant="secondary" className="rounded-full text-[10px]">{questionType}</Badge><Badge variant="outline" className={`rounded-full text-[10px] ${verdictClasses(evaluation.verdict)}`}>{evaluation.verdict || "needs-work"}</Badge></span><span className="mt-1.5 block truncate text-left text-xs font-medium text-foreground">{question?.question || "Question no longer available"}</span></span>
                            </div>
                            <span className={`shrink-0 text-sm font-semibold ${scoreTone(questionScore)}`}>{evaluation.pointsEarned}/{evaluation.pointsPossible}</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 sm:px-5">
                            <div className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                              <p className="text-sm leading-6 text-foreground">{question?.question || "Question no longer available"}</p>
                              <div className="rounded-2xl bg-muted/40 p-4"><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Your answer</p><div className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground"><AnswerPreview answer={answer} /></div></div>
                              <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-4"><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">AI feedback</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{evaluation.feedback}</p></div>
                              <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-emerald-50/60 p-4 dark:bg-emerald-950/15"><p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Strengths</p><div className="mt-2"><BulletList items={evaluation.strengths || []} empty="No strengths captured." /></div></div><div className="rounded-2xl bg-amber-50/60 p-4 dark:bg-amber-950/15"><p className="text-xs font-medium text-amber-800 dark:text-amber-300">Improvements</p><div className="mt-2"><BulletList items={evaluation.improvements || []} empty="No improvements captured." /></div></div></div>
                            </div>
                          </AccordionContent>
                        </div>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              ) : <p className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">A detailed per-question review was not returned for this attempt.</p>}
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  if (!currentQ) {
    return <div className="flex min-h-[320px] items-center justify-center px-4"><div className="text-center"><IconBrain className="mx-auto size-9 animate-pulse text-primary" /><p className="mt-3 text-sm font-medium">Preparing your assessment...</p><p className="mt-1 text-xs text-muted-foreground">The question set will appear as soon as generation completes.</p></div></div>
  }

  return (
    <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[280px_1fr]">
        <Card className="h-fit rounded-3xl"><CardHeader className="border-b pb-4"><div className="flex items-center justify-between"><Badge variant="outline" className="rounded-full">{sessionStatus}</Badge><Link href="/student/mock"><Button variant="ghost" size="sm" className="rounded-xl text-xs"><IconArrowLeft className="mr-1 size-3.5" />Hub</Button></Link></div><CardTitle className="text-lg">{mockSession?.job_role_context || "AI Mock Assessment"}</CardTitle><CardDescription className="text-xs">Question {currentIdx + 1} of {totalQuestions}</CardDescription></CardHeader><CardContent className="space-y-5 pt-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><StatCard label="Answered" value={`${answeredCount}/${totalQuestions}`} helper="Saved responses" /><StatCard label="Progress" value={`${Math.round(progressValue)}%`} helper="Completion" /></div><div><div className="flex items-center justify-between text-xs"><span className="font-medium">Question navigator</span><span className="text-muted-foreground">Jump</span></div><div className="mt-2 grid grid-cols-5 gap-2">{questions.map((question, index) => <button key={question.id} type="button" onClick={() => setCurrentIdx(index)} className={`flex h-9 items-center justify-center rounded-xl border text-xs font-medium transition ${index === currentIdx ? "border-primary bg-primary text-primary-foreground" : answers[question.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "hover:bg-muted"}`}>{index + 1}</button>)}</div></div></CardContent></Card>
        <div className="space-y-5">
          {error && <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><IconAlertTriangle className="mt-0.5 size-4 shrink-0" />{error}</div>}
          <Card className="rounded-3xl"><CardHeader className="border-b pb-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Badge variant="secondary" className="rounded-full">{mockSession?.mock_type || "PRACTICE"}</Badge><Badge variant="outline" className="rounded-full">{currentQ.type}</Badge></div><Button onClick={() => void submitAssessment()} disabled={submitting} size="sm" className="rounded-xl">{submitting ? "Evaluating..." : "Submit assessment"}</Button></div><CardTitle className="text-base leading-6">{currentQ.question}</CardTitle><div className="flex flex-wrap gap-2">{currentQ.skill && <Badge variant="secondary" className="rounded-full text-[10px]">{currentQ.skill}</Badge>}{currentQ.points && <Badge variant="outline" className="rounded-full text-[10px]">{currentQ.points} points</Badge>}</div></CardHeader><CardContent className="space-y-5 pt-5">
            {isMCQQuestion(currentQ) && <QuestionnaireMCQ question={currentQ} selectedOptionId={currentAnswer?.selectedOptionId} onSelectOption={(optionId) => setAnswers((previous) => ({ ...previous, [currentQ.id]: { questionId: currentQ.id, selectedOptionId: optionId } }))} />}
            {!isMCQQuestion(currentQ) && currentQ.type !== "CODE" && <div className="space-y-4"><div className="rounded-2xl bg-muted/40 p-4"><div className="flex items-center gap-2 text-xs font-medium"><IconFileText className="size-4 text-primary" />Response guidance</div><p className="mt-2 text-xs leading-6 text-muted-foreground">Explain the concept clearly, mention trade-offs where relevant, and keep your answer structured.</p></div><Textarea value={currentAnswer?.answerText || ""} onChange={(event) => setAnswers((previous) => ({ ...previous, [currentQ.id]: { ...previous[currentQ.id], questionId: currentQ.id, answerText: event.target.value } }))} placeholder="Type your explanation in a clear, structured way..." className="min-h-[220px] rounded-2xl text-sm" /></div>}
            {currentQ.type === "CODE" && <div className="space-y-4"><div className="rounded-2xl bg-muted/40 p-4"><div className="flex items-center gap-2 text-xs font-medium"><IconCode className="size-4 text-primary" />Coding prompt</div>{currentQ.description && <p className="mt-2 text-xs leading-6 text-muted-foreground">{currentQ.description}</p>}{currentQ.constraints?.length ? <ul className="mt-3 space-y-1 text-xs text-muted-foreground">{currentQ.constraints.map((constraint) => <li key={constraint}>· {constraint}</li>)}</ul> : null}</div><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><Select value={currentAnswer?.codeLanguage || currentQ.defaultLanguage || "TypeScript"} onValueChange={(language) => setAnswers((previous) => ({ ...previous, [currentQ.id]: { ...(previous[currentQ.id] || { questionId: currentQ.id }), questionId: currentQ.id, codeLanguage: language || "TypeScript" } }))}><SelectTrigger className="h-10 rounded-xl sm:w-48"><SelectValue /></SelectTrigger><SelectContent>{(currentQ.languageOptions || ["TypeScript", "JavaScript", "Python", "Java", "C++"]).map((language) => <SelectItem key={language} value={language}>{language}</SelectItem>)}</SelectContent></Select><span className="text-xs text-muted-foreground">Choose the language for evaluation.</span></div><Textarea value={currentAnswer?.answerText || ""} onChange={(event) => setAnswers((previous) => ({ ...previous, [currentQ.id]: { ...(previous[currentQ.id] || { questionId: currentQ.id }), questionId: currentQ.id, answerText: event.target.value } }))} placeholder="Paste your solution or explain your approach..." className="min-h-[260px] rounded-2xl font-mono text-sm" /></div>}
            <div className="flex items-center justify-between border-t pt-4"><span className="text-xs text-muted-foreground"><span className="font-semibold text-primary">{answeredCount}</span> of {totalQuestions} answered</span><div className="flex gap-2"><Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCurrentIdx((previous) => Math.max(0, previous - 1))} disabled={currentIdx === 0}>Previous</Button><Button size="sm" className="rounded-xl" onClick={() => setCurrentIdx((previous) => Math.min(totalQuestions - 1, previous + 1))} disabled={currentIdx >= totalQuestions - 1}>Next<IconArrowRight className="ml-1 size-3.5" /></Button></div></div>
          </CardContent></Card>
          <div className="rounded-2xl border bg-muted/20 p-4 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><IconClock className="size-4 text-primary" />Progress</div><Progress value={progressValue} className="mt-3 h-1.5" /><p className="mt-3 leading-6">Your answers remain in this session until you submit the assessment.</p></div>
        </div>
      </div>
    </main>
  )
}
