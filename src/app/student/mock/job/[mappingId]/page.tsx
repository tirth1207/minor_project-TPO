"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useStudent } from "@/app/student/student-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconSparkles,
  IconAlertTriangle,
} from "@tabler/icons-react"
import type { JobWithMapping } from "@/app/student/student-context"

function formatLpa(value: number | null | undefined) {
  if (!value) return "Not disclosed"
  return `Up to INR ${value} LPA`
}

function formatThreshold(value: number | null | undefined) {
  return `${Math.max(0, Math.round(value ?? 0))}%`
}

export default function StudentJobMockStartPage() {
  const params = useParams()
  const router = useRouter()
  const mappingId = params.mappingId as string
  const { jobs, loading } = useStudent()

  const [creatingMock, setCreatingMock] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const jobData = React.useMemo<JobWithMapping | null>(
    () => jobs.find((entry) => entry.mapping?.id === mappingId) || null,
    [jobs, mappingId]
  )

  const job = jobData?.job
  const mapping = jobData?.mapping
  const passScore = job?.mock_pass_score || 70

  const handleStartJobAssessment = async () => {
    setCreatingMock(true)
    setError(null)

    try {
      const res = await fetch(`/api/students/mock-interviews/job/${mappingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

      if (res.ok && data.mock?.id) {
        router.push(`/student/mock/${data.mock.id}`)
        return
      }

      setError(data.error || "Failed to initialize job mock interview assessment.")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "An unexpected error occurred.")
    } finally {
      setCreatingMock(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto min-h-[420px] max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardContent className="space-y-4 p-6">
            <div className="h-5 w-40 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
            </div>
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !jobData) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
        <Link href="/student/mock">
          <Button variant="outline" size="sm" className="h-9 rounded-xl px-4 text-xs font-medium">
            <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to mock hub
          </Button>
        </Link>
      </div>
    )
  }

  if (!job || !mapping) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
          <CardHeader className="space-y-2">
            <Badge variant="outline" className="w-fit rounded-full px-2.5 py-1 text-[10px] font-medium">
              Job assessment
            </Badge>
            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Assessment drive not found
            </CardTitle>
            <CardDescription className="text-xs leading-6">
              We could not locate this mock assessment in your active job list. It may not be approved for your college yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3 pb-6">
            <Link href="/student/mock">
              <Button variant="outline" size="sm" className="h-9 rounded-xl px-4 text-xs font-medium">
                <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back to mock hub
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/student/mock">
        <Button variant="ghost" size="sm" className="h-9 rounded-xl px-2 text-xs text-zinc-500">
          <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back to mock hub
        </Button>
      </Link>

      <Card className="overflow-hidden rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-4 border-b border-border bg-card pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
              <IconSparkles className="mr-1 h-3 w-3 text-primary" />
              Job gate assessment
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-semibold">
              Pass {formatThreshold(passScore)}
            </Badge>
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {job.title}
            </CardTitle>
            <CardDescription className="text-xs leading-6">
              {job.company?.company_name || "Corporate Partner"} - {job.location} - {job.work_mode}
            </CardDescription>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Package</p>
              <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{formatLpa(job.ctc_max)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Threshold</p>
              <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{formatThreshold(passScore)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/85 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Assessment type</p>
              <p className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">Job-required mock</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-3 text-center sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconClock className="mx-auto h-4 w-4 text-primary" />
              <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">8-10 questions</div>
              <div className="text-[10px] text-zinc-500">MCQ, theory, and coding</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconCheck className="mx-auto h-4 w-4 text-primary" />
              <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">Job-gated</div>
              <div className="text-[10px] text-zinc-500">Required before applying</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconBriefcase className="mx-auto h-4 w-4 text-primary" />
              <div className="mt-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{job.company?.company_name || "Corporate Partner"}</div>
              <div className="text-[10px] text-zinc-500">Placement drive owner</div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Assessment rules</h3>
                <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                  The question set is locked to this job posting. Your score must clear the passing threshold before the application gate opens.
                </p>
              </div>

              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {job.min_cgpa ? `Minimum CGPA: ${job.min_cgpa}` : "No CGPA threshold recorded"}
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {job.max_backlogs !== null && job.max_backlogs !== undefined ? `Maximum backlogs: ${job.max_backlogs}` : "No backlog threshold recorded"}
                </div>
                <div className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                  The generated interview will mirror the job description and approved drive settings.
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Role summary</p>
                <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                  {job.description}
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">What happens next</h3>
              <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  1. We create a locked session for this drive.
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  2. The AI generates the assessment questions and rubric.
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                  3. You answer, submit, and immediately receive a clean score report.
                </div>
              </div>

              <Button
                onClick={() => void handleStartJobAssessment()}
                disabled={creatingMock}
                className="h-11 w-full rounded-xl px-5 text-sm font-medium"
              >
                <IconSparkles className="mr-1 h-4 w-4" />
                {creatingMock ? "Opening assessment..." : "Start job assessment"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
