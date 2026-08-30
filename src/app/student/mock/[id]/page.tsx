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
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconAlertTriangle,
  IconCode,
  IconFileText,
  IconRefresh,
  IconBrain,
  IconLoader,
} from "@tabler/icons-react"

import type {
  MockInterviewQuestion,
  StudentAnswer,
  MockEvaluationResult,
} from "@/types/mock-interview"

export default function StudentMockExecutionPage() {
  const params = useParams()
  const mockId = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [processing, setProcessing] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [mockSession, setMockSession] = React.useState<any>(null)

  const [questions, setQuestions] =
    React.useState<MockInterviewQuestion[]>([])

  const [currentIdx, setCurrentIdx] = React.useState(0)

  const [answers, setAnswers] =
    React.useState<Record<string, StudentAnswer>>({})

  const [evaluationResult, setEvaluationResult] =
    React.useState<MockEvaluationResult | null>(null)

  /* ============================================================
     PROCESS INTERVIEW
  ============================================================ */

  const processInterview = React.useCallback(async () => {
    if (!mockId) return

    setProcessing(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/students/mock-interviews/${mockId}/process`,
        {
          method: "POST",
        }
      )

      const json = await res.json()

      const mockData = json.data?.mock || json.mock

      if (res.ok && mockData) {
        setMockSession(mockData)

        if (
          Array.isArray(mockData.questions) &&
          mockData.questions.length > 0
        ) {
          setQuestions(mockData.questions)

          setCurrentIdx((previous) => {
            if (previous >= mockData.questions.length) {
              return 0
            }

            return previous
          })
        }

        if (mockData.status === "FAILED") {
          setError(
            json.error ||
              "Question generation failed. Please try again."
          )
        }
      } else {
        setError(
          json.error ||
            "Failed to process interview generation."
        )
      }
    } catch (err: any) {
      console.error("[Mock Page] Processing error:", err)

      setError(
        err?.message ||
          "An unexpected error occurred during processing."
      )
    } finally {
      setProcessing(false)
    }
  }, [mockId])

  /* ============================================================
     LOAD MOCK SESSION
  ============================================================ */

  const loadMockSession = React.useCallback(async () => {
    if (!mockId) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/students/mock-interviews/${mockId}`
      )

      const json = await res.json()

      const mockData = json.data?.mock || json.mock

      if (res.ok && mockData) {
        setMockSession(mockData)

        const qs = Array.isArray(mockData.questions)
          ? mockData.questions
          : []

        setQuestions(qs)

        setCurrentIdx((previous) => {
          if (qs.length === 0) return 0

          if (previous >= qs.length) {
            return 0
          }

          return previous
        })

        if (
          mockData.status === "EVALUATED" &&
          mockData.ai_results
        ) {
          setEvaluationResult(mockData.ai_results)
        }

        if (Array.isArray(mockData.answers)) {
          const map: Record<string, StudentAnswer> = {}

          mockData.answers.forEach(
            (ans: StudentAnswer) => {
              if (ans?.questionId) {
                map[ans.questionId] = ans
              }
            }
          )

          setAnswers(map)
        }

        /*
         * Only trigger generation for QUEUED / REQUESTED.
         *
         * FAILED is intentionally NOT automatically retried.
         * The student must click retry.
         */
        if (
          ["QUEUED", "REQUESTED"].includes(
            mockData.status
          )
        ) {
          processInterview()
        }
      } else {
        setError(
          json.error ||
            "Failed to fetch mock interview session."
        )
      }
    } catch (err: any) {
      console.error(
        "[Mock Page] Session loading error:",
        err
      )

      setError(
        err?.message ||
          "Failed to load session."
      )
    } finally {
      setLoading(false)
    }
  }, [mockId, processInterview])

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  React.useEffect(() => {
    if (mockId) {
      loadMockSession()
    }
  }, [mockId, loadMockSession])

  /* ============================================================
     POLLING WHILE GENERATING
  ============================================================ */

  React.useEffect(() => {
    if (!mockSession) return

    const status = mockSession.status

    if (
      !["QUEUED", "PROCESSING", "REQUESTED"].includes(
        status
      )
    ) {
      return
    }

    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/students/mock-interviews/${mockId}`
        )

        const json = await res.json()

        const mockData =
          json.data?.mock || json.mock

        if (res.ok && mockData) {
          setMockSession(mockData)

          if (
            Array.isArray(mockData.questions) &&
            mockData.questions.length > 0
          ) {
            setQuestions(mockData.questions)

            setCurrentIdx((previous) => {
              if (
                previous >=
                mockData.questions.length
              ) {
                return 0
              }

              return previous
            })
          }

          if (
            ["ANSWERING", "EVALUATED", "FAILED"].includes(
              mockData.status
            )
          ) {
            clearInterval(timer)
          }
        }
      } catch (err) {
        console.error(
          "[Mock Page] Polling error:",
          err
        )
      }
    }, 2500)

    return () => clearInterval(timer)
  }, [mockId, mockSession?.status])

  /* ============================================================
     CURRENT QUESTION
  ============================================================ */

  const currentQ =
    questions.length > 0
      ? questions[
          Math.min(
            currentIdx,
            questions.length - 1
          )
        ]
      : undefined

  /* ============================================================
     ANSWER HANDLERS
  ============================================================ */

  const handleMcqSelect = (
    qId: string,
    optionId: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        questionId: qId,
        selectedOptionId: optionId,
      },
    }))
  }

  const handleTextChange = (
    qId: string,
    text: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        answerText: text,
      },
    }))
  }

  const handleLanguageChange = (
    qId: string,
    lang: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        codeLanguage: lang,
      },
    }))
  }

  /* ============================================================
     SUBMIT ASSESSMENT
  ============================================================ */

  const handleSubmitAssessment = async () => {
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const answerList = Object.values(answers)

      const res = await fetch(
        `/api/students/mock-interviews/${mockId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: answerList,
          }),
        }
      )

      const json = await res.json()

      const resData = json.data || json

      if (res.ok && resData.result) {
        setEvaluationResult(resData.result)
        setMockSession(resData.mock)
      } else {
        setError(
          json.error ||
            "Submission and evaluation failed."
        )
      }
    } catch (err: any) {
      console.error(
        "[Mock Page] Submission error:",
        err
      )

      setError(
        err?.message ||
          "Failed to submit assessment."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-2">
        <IconBrain className="h-8 w-8 animate-pulse text-primary" />

        <p className="text-xs font-medium text-zinc-500">
          Loading AI Assessment Environment...
        </p>
      </div>
    )
  }
  console.log("Questions:", questions)
  /* ============================================================
     ERROR WITHOUT SESSION
  ============================================================ */

  if (error && !mockSession) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl space-y-4 text-center">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
            {error ||
              "Assessment session unavailable or access forbidden."}
          </div>

          <Link href="/student/mock">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              Return to Mock Hub
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  /* ============================================================
     GENERATING / PROCESSING
  ============================================================ */

  if (
    mockSession &&
    ["QUEUED", "PROCESSING", "REQUESTED"].includes(
      mockSession.status
    )
  ) {
    return (
      <div className="w-full px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl text-center">
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <IconLoader className="mx-auto h-10 w-10 animate-spin text-zinc-500" />

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Generating Technical Questions...
              </h3>

              <p className="mx-auto max-w-md text-xs text-zinc-500">
                Our AI engine is crafting custom MCQ,
                theory, and coding challenges tailored
                to{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {mockSession.job_role_context ||
                    "your role"}
                </strong>
                .
              </p>
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={processInterview}
                disabled={processing}
                className="h-8 gap-1.5 text-xs"
              >
                <IconRefresh
                  className={`h-3.5 w-3.5 ${
                    processing
                      ? "animate-spin text-primary"
                      : ""
                  }`}
                />

                {processing
                  ? "Processing..."
                  : "Force Generation"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ============================================================
     GENERATION FAILED
  ============================================================ */

  if (
    mockSession &&
    mockSession.status === "FAILED"
  ) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-xl text-center">
          <Card className="space-y-4 rounded-2xl border-rose-200 p-6 dark:border-rose-900/50">
            <IconAlertTriangle className="mx-auto h-10 w-10 text-rose-500" />

            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">
                Question Generation Failed
              </h3>

              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {error ||
                  "We encountered an issue generating your assessment questions. You can retry generation now."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                size="sm"
                onClick={processInterview}
                disabled={processing}
                className="h-8 gap-1.5 text-xs"
              >
                <IconRefresh
                  className={`h-3.5 w-3.5 ${
                    processing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {processing
                  ? "Retrying..."
                  : "Retry Question Generation"}
              </Button>

              <Link href="/student/mock">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  Back to Mock Hub
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  /* ============================================================
     EVALUATION REPORT
  ============================================================ */

  if (
    mockSession?.status === "EVALUATED" ||
    evaluationResult
  ) {
    const report =
      evaluationResult ||
      mockSession.ai_results

    const passThreshold =
      mockSession.job_spec_snapshot
        ?.mockPassScore || 70

    const isPassed = Boolean(
      mockSession.passed
    )

    return (
      <div className="w-full space-y-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/student/mock">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <IconArrowLeft className="h-3.5 w-3.5" />
              Mock Hub
            </Button>
          </Link>

          {mockSession.job_college_mapping_id && (
            <Link href="/student/jobs">
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
              >
                Back to Campus Jobs
              </Button>
            </Link>
          )}
        </div>

        <Card className="w-full rounded-2xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold">
                  {mockSession.job_role_context ||
                    "AI Assessment Report"}
                </CardTitle>

                <CardDescription className="text-xs text-zinc-500">
                  Completed on{" "}
                  {mockSession.completed_at
                    ? new Date(
                        mockSession.completed_at
                      ).toLocaleDateString()
                    : "N/A"}
                </CardDescription>
              </div>

              <Badge
                variant="outline"
                className={`px-3 py-1 text-xs font-semibold ${
                  isPassed
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {isPassed
                  ? `PASSED (${mockSession.overall_score || 0}% ≥ ${passThreshold}%) ✓`
                  : `NEEDS IMPROVEMENT (${mockSession.overall_score || 0}% < ${passThreshold}%)`}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-2xl font-extrabold text-primary">
                  {report?.overallScore ??
                    mockSession.overall_score ??
                    0}
                  %
                </div>

                <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                  Overall Score
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                  {report?.mcqScore ??
                    mockSession.mcq_score ??
                    0}
                  %
                </div>

                <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                  MCQ Section
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                  {report?.theoryScore ??
                    mockSession.theory_score ??
                    0}
                  %
                </div>

                <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                  Theory Section
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
                  {report?.codingScore ??
                    mockSession.coding_score ??
                    0}
                  %
                </div>

                <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                  Coding Section
                </div>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30">
              <h4 className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                <IconSparkles className="h-4 w-4 text-amber-500" />
                AI Assessment Summary
              </h4>

              <p className="text-zinc-600 dark:text-zinc-400">
                {report?.summary ||
                  mockSession.ai_summary}
              </p>
            </div>

            {report?.skillScores && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Skill Proficiency Breakdown
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(
                    report.skillScores
                  ).map(
                    ([skill, score]: [
                      string,
                      any
                    ]) => (
                      <div
                        key={skill}
                        className="space-y-1 rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800"
                      >
                        <div className="flex justify-between font-medium">
                          <span>{skill}</span>

                          <span className="font-semibold text-primary">
                            {score}%
                          </span>
                        </div>

                        <Progress
                          value={score}
                          className="h-1.5"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ============================================================
     ACTIVE TEST
  ============================================================ */

  const answeredCount =
    Object.keys(answers).length

  const totalQuestions =
    questions.length

  /*
   * IMPORTANT:
   *
   * If the API hasn't returned questions yet,
   * never attempt to render currentQ.
   */
  if (!currentQ) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <IconBrain className="h-8 w-8 animate-pulse text-primary" />

          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Preparing your assessment...
          </p>

          <p className="text-xs text-zinc-500">
            Please wait while your questions are loaded.
          </p>
        </div>
      </div>
    )
  }

  /* ============================================================
     FULL-WIDTH QUESTIONNAIRE
  ============================================================ */

  return (
    <div className="w-full px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      {/* Error */}
      {error && (
        <div className="mb-5 flex w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
          <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />

          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          TOP ASSESSMENT HEADER
      ======================================================== */}

      <div className="w-full rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex w-full flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-0.5">
            <Badge
              variant="outline"
              className="text-[10px]"
            >
              {mockSession?.mock_type ||
                "PRACTICE"}
            </Badge>

            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {mockSession?.job_role_context ||
                "AI Mock Assessment"}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="text-right text-xs">
              <span className="font-semibold text-primary">
                {answeredCount}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {totalQuestions}
              </span>{" "}
              answered
            </div>

            <Button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <IconCheck className="h-3.5 w-3.5" />

              {submitting
                ? "Evaluating Answers..."
                : "Submit Assessment"}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <Progress
            value={
              totalQuestions > 0
                ? (answeredCount /
                    totalQuestions) *
                  100
                : 0
            }
            className="h-1"
          />
        </div>
      </div>

      {/* ========================================================
          QUESTION STEPPER
      ======================================================== */}

      <div className="mt-5 w-full overflow-x-auto">
        <div className="flex min-w-max gap-1.5">
          {questions.map((q, idx) => {
            const isAnswered =
              Boolean(answers[q.id])

            const isCurrent =
              idx === currentIdx

            return (
              <button
                key={q.id}
                type="button"
                onClick={() =>
                  setCurrentIdx(idx)
                }
                className={`
                  relative
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  text-xs
                  font-semibold
                  transition-all
                  ${
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : isAnswered
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                  }
                `}
              >
                {idx + 1}

                {isAnswered &&
                  !isCurrent && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================================
          QUESTION
          NO max-w-4xl HERE
      ======================================================== */}

      <div className="mt-5 w-full space-y-4">
        {/* ======================================================
            MCQ
        ====================================================== */}

        {currentQ.type === "MCQ" && (
          <div className="w-full">
            <QuestionnaireMCQ
              question={currentQ as any}
              selectedOptionId={
                answers[currentQ.id]
                  ?.selectedOptionId
              }
              onSelectOption={(optId) =>
                handleMcqSelect(
                  currentQ.id,
                  optId
                )
              }
            />
          </div>
        )}

        {/* ======================================================
            THEORY / BEHAVIORAL
        ====================================================== */}

        {(currentQ.type === "THEORY" ||
          currentQ.type ===
            "BEHAVIORAL") && (
          <Card className="w-full rounded-xl border-zinc-200 p-5 dark:border-zinc-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold text-primary"
                  >
                    <IconFileText className="mr-1 inline h-3 w-3" />

                    {currentQ.type}
                  </Badge>

                  {currentQ.skill && (
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {currentQ.skill}
                    </Badge>
                  )}
                </div>

                <span className="shrink-0 text-xs font-semibold text-zinc-500">
                  {currentQ.points ||
                    10}{" "}
                  Points
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {currentQ.question}
                </h3>

                {(currentQ as any)
                  .expectedTopics &&
                  Array.isArray(
                    (currentQ as any)
                      .expectedTopics
                  ) &&
                  (currentQ as any)
                    .expectedTopics.length >
                    0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(
                        currentQ as any
                      ).expectedTopics.map(
                        (
                          topic: string
                        ) => (
                          <Badge
                            key={topic}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {topic}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
              </div>

              <Textarea
                value={
                  answers[currentQ.id]
                    ?.answerText || ""
                }
                onChange={(e) =>
                  handleTextChange(
                    currentQ.id,
                    e.target.value
                  )
                }
                placeholder="Type your explanation and technical reasoning in detail..."
                className="min-h-[180px] w-full resize-y text-xs"
              />
            </div>
          </Card>
        )}

        {/* ======================================================
            CODE
        ====================================================== */}

        {currentQ.type === "CODE" && (
          <Card className="w-full rounded-xl border-zinc-200 p-5 dark:border-zinc-800">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold text-primary"
                  >
                    <IconCode className="mr-1 inline h-3 w-3" />

                    CODING
                  </Badge>

                  {currentQ.skill && (
                    <Badge
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {currentQ.skill}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500">
                    {currentQ.points ||
                      15}{" "}
                    Points
                  </span>

                  <Select
                    value={
                      answers[
                        currentQ.id
                      ]?.codeLanguage ||
                      (currentQ as any)
                        .defaultLanguage ||
                      "TypeScript"
                    }
                    onValueChange={(
                      lang
                    ) =>
                      handleLanguageChange(
                        currentQ.id,
                        lang
                      )
                    }
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {(
                        (currentQ as any)
                          .languageOptions ||
                        [
                          "TypeScript",
                          "JavaScript",
                          "Python",
                          "Java",
                          "C++",
                        ]
                      ).map(
                        (
                          language: string
                        ) => (
                          <SelectItem
                            key={language}
                            value={language}
                            className="text-xs"
                          >
                            {language}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {currentQ.question}
                </h3>

                {(currentQ as any)
                  .description && (
                  <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    {
                      (
                        currentQ as any
                      ).description
                    }
                  </p>
                )}

                {(currentQ as any)
                  .constraints &&
                  Array.isArray(
                    (currentQ as any)
                      .constraints
                  ) &&
                  (currentQ as any)
                    .constraints.length >
                    0 && (
                    <div className="space-y-1 pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Constraints
                      </p>

                      <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                        {(
                          currentQ as any
                        ).constraints.map(
                          (
                            constraint: string
                          ) => (
                            <li
                              key={
                                constraint
                              }
                            >
                              {constraint}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>

              <Textarea
                value={
                  answers[currentQ.id]
                    ?.answerText ||
                  (currentQ as any)
                    .starterCode ||
                  ""
                }
                onChange={(e) =>
                  handleTextChange(
                    currentQ.id,
                    e.target.value
                  )
                }
                placeholder="Write your code implementation here..."
                spellCheck={false}
                className="min-h-[350px] w-full resize-y border-zinc-800 bg-zinc-950 font-mono text-xs leading-relaxed text-zinc-100"
              />
            </div>
          </Card>
        )}

        {/* ======================================================
            PREVIOUS / NEXT
        ====================================================== */}

        <div className="flex w-full items-center justify-between pb-8 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentIdx(
                Math.max(
                  0,
                  currentIdx - 1
                )
              )
            }
            disabled={currentIdx === 0}
            className="h-9 gap-1 text-xs"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />

            Previous
          </Button>

          <div className="text-xs text-zinc-500">
            Question{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {currentIdx + 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {totalQuestions}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentIdx(
                Math.min(
                  totalQuestions - 1,
                  currentIdx + 1
                )
              )
            }
            disabled={
              currentIdx ===
              totalQuestions - 1
            }
            className="h-9 gap-1 text-xs"
          >
            Next

            <IconArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}