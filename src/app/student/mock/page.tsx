"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useStudent } from "../student-context"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  IconBrain,
  IconBriefcase,
  IconHistory,
  IconSparkles,
  IconArrowRight,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react"

function formatScore(value: number | null | undefined) {
  return `${Math.max(0, Math.min(100, Math.round(value ?? 0)))}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet completed"
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function toneForStatus(status: string) {
  switch (status) {
    case "EVALUATED":
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300"
    case "FAILED":
      return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300"
    case "PROCESSING":
    case "QUEUED":
    case "REQUESTED":
    case "EVALUATING":
      return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300"
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "REQUESTED":
      return "Requested"
    case "QUEUED":
      return "Queued"
    case "PROCESSING":
      return "Generating"
    case "ANSWERING":
      return "Ready to answer"
    case "EVALUATING":
      return "Evaluating"
    case "EVALUATED":
      return "Completed"
    case "FAILED":
      return "Failed"
    default:
      return status
  }
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-zinc-900 dark:text-zinc-100"
}

function formatLpa(value: number | null | undefined) {
  if (!value) return "Not disclosed"
  return `Up to INR ${value} LPA`
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string
  value: string
  helper: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
          <p className="text-xs text-zinc-500">{helper}</p>
        </div>
        <div className="rounded-full border border-zinc-200 bg-zinc-50 p-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function StudentMockHubPage() {
  const router = useRouter()
  const { jobs, mockInterviews, refreshMockInterviews } = useStudent()

  const [selectedRole, setSelectedRole] = React.useState("Full Stack Developer")
  const [startingPractice, setStartingPractice] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)

  const requiredJobPostings = React.useMemo(
    () => jobs.filter((entry) => entry.job?.require_mock),
    [jobs]
  )

  const evaluatedAttempts = React.useMemo(
    () => mockInterviews.filter((mock) => mock.status === "EVALUATED"),
    [mockInterviews]
  )

  const passingAttempts = React.useMemo(
    () => evaluatedAttempts.filter((mock) => Boolean(mock.passed)),
    [evaluatedAttempts]
  )

  const latestAttempt = React.useMemo(
    () =>
      [...mockInterviews].sort(
        (a, b) =>
          new Date(b.completed_at || b.updated_at || 0).getTime() -
          new Date(a.completed_at || a.updated_at || 0).getTime()
      )[0],
    [mockInterviews]
  )

  const skillMetrics = React.useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {}

    mockInterviews.forEach((mock) => {
      if (!mock.skill_scores || typeof mock.skill_scores !== "object") return

      Object.entries(mock.skill_scores).forEach(([skill, score]) => {
        const value = Number(score)
        if (Number.isNaN(value)) return
        if (!totals[skill]) totals[skill] = { total: 0, count: 0 }
        totals[skill].total += value
        totals[skill].count += 1
      })
    })

    return Object.entries(totals)
      .map(([skill, data]) => ({
        skill,
        score: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.score - a.score)
  }, [mockInterviews])

  const handleStartPractice = async () => {
    const role = selectedRole.trim()
    if (!role) return

    setStartingPractice(true)
    setStartError(null)

    try {
      const res = await fetch("/api/students/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      const data = await res.json()
      if (res.ok && data.mock?.id) {
        await refreshMockInterviews()
        router.push(`/student/mock/${data.mock.id}`)
        return
      }

      setStartError(data.error || "Could not start the practice session.")
    } catch (error) {
      console.error("Error starting practice mock:", error)
      setStartError("Could not connect to the assessment service. Please try again.")
    } finally {
      setStartingPractice(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-300">
              <IconSparkles className="h-3.5 w-3.5 text-primary" />
              AI Mock Interview Studio
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
                Practice interviews and job-gated assessments in one clean workspace.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Generate a polished practice interview for any target role, then take job-specific assessments tied to live placement drives. Scores, strengths, weak spots, and history are all visible in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-semibold">
                <IconCheck className="mr-1 h-3 w-3" />
                Instant practice sessions
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-semibold">
                <IconBriefcase className="mr-1 h-3 w-3" />
                Job-required mock gates
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-semibold">
                <IconHistory className="mr-1 h-3 w-3" />
                Full attempt history
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {latestAttempt
                ? `Most recent attempt: ${latestAttempt.job_role_context} - ${formatDate(latestAttempt.completed_at || latestAttempt.updated_at || null)}`
                : "No saved attempts yet. Start a practice session to build your history."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              label="Evaluated"
              value={String(evaluatedAttempts.length)}
              helper="Completed mock interviews"
              icon={<IconBrain className="h-4 w-4" />}
            />
            <StatCard
              label="Passed"
              value={String(passingAttempts.length)}
              helper="Sessions above threshold"
              icon={<IconCheck className="h-4 w-4" />}
            />
            <StatCard
              label="Required drives"
              value={String(requiredJobPostings.length)}
              helper="Active job gates available"
              icon={<IconBriefcase className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <Tabs defaultValue="practice" className="w-full space-y-5">
        <TabsList className="flex w-full max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid sm:h-11 sm:max-w-lg sm:grid-cols-3">
          <TabsTrigger value="practice" className="min-w-[110px] flex-1 gap-1.5 rounded-xl">
            <IconSparkles className="h-3.5 w-3.5" />
            Practice Hub
          </TabsTrigger>
          <TabsTrigger value="job-assessments" className="min-w-[130px] flex-1 gap-1.5 rounded-xl">
            <IconBriefcase className="h-3.5 w-3.5" />
            Job Assessments
          </TabsTrigger>
          <TabsTrigger value="history" className="min-w-[110px] flex-1 gap-1.5 rounded-xl">
            <IconHistory className="h-3.5 w-3.5" />
            Attempt History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
            <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <IconSparkles className="h-4 w-4 text-primary" />
                  Practice interview
                </CardTitle>
                <CardDescription className="text-xs leading-6">
                  Create a fresh AI mock session for any target role. Practice attempts do not unlock job applications, but they do build your skill profile and score history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Target role or domain
                  </label>
                  <Input
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="e.g. Frontend Developer, Data Analyst, DevOps Engineer"
                    className="h-11 rounded-xl text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Frontend Developer", "Backend Developer", "Full Stack Engineer", "Data Analyst", "DevOps Engineer"].map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRole(role)}
                      className="h-8 rounded-full border-zinc-200 px-3 text-[11px] font-medium dark:border-zinc-700"
                    >
                      {role}
                    </Button>
                  ))}
                </div>

                {startError && (
                  <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300">
                    <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{startError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 text-xs text-zinc-500">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Ready when you are</p>
                    <p>We will queue the interview, generate questions, and open the session automatically.</p>
                  </div>
                  <Button
                    onClick={handleStartPractice}
                    disabled={startingPractice || !selectedRole.trim()}
                    className="h-11 rounded-xl px-5 text-sm font-medium"
                  >
                    {startingPractice ? "Generating assessment..." : "Start practice session"}
                    <IconArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">What you get</CardTitle>
                  <CardDescription className="text-xs">
                    A focused assessment with visible scoring and compact feedback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Balanced MCQ, theory, and coding questions tailored to your target role.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Clean score breakdown with strengths, improvements, and next steps.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p>Each attempt is saved so your improvement curve stays visible.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Latest skill signal</CardTitle>
                  <CardDescription className="text-xs">
                    Aggregated from evaluated sessions only.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {skillMetrics.length === 0 ? (
                    <p className="py-4 text-center text-xs text-zinc-500">
                      No evaluated mock scores yet. Start a practice session to begin building your profile.
                    </p>
                  ) : (
                    skillMetrics.slice(0, 5).map((item) => (
                      <div key={item.skill} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.skill}</span>
                          <span className={`font-semibold ${scoreTone(item.score)}`}>{formatScore(item.score)}</span>
                        </div>
                        <Progress value={item.score} className="h-1.5" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="job-assessments" className="space-y-4">
          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <IconBriefcase className="h-4 w-4 text-primary" />
                Job-required assessments
              </CardTitle>
              <CardDescription className="text-xs leading-6">
                These placement drives require a passing mock score before you can submit the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requiredJobPostings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                  <IconBriefcase className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    No active placement drives currently require a mock assessment.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    When your college approves a drive with a mock gate, it will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {requiredJobPostings.map((entry) => {
                    const job = entry.job!
                    const mapping = entry.mapping!
                    const attempts = mockInterviews.filter(
                      (mock) =>
                        mock.job_college_mapping_id === mapping.id &&
                        mock.mock_type === "JOB_REQUIRED" &&
                        mock.status === "EVALUATED"
                    )
                    const bestAttempt = attempts.sort(
                      (a, b) => (b.overall_score || 0) - (a.overall_score || 0)
                    )[0]
                    const passThreshold = job.mock_pass_score || 70
                    const hasPassed = Boolean(bestAttempt && (bestAttempt.overall_score ?? 0) >= passThreshold)

                    return (
                      <div
                        key={mapping.id}
                        className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{job.title}</h3>
                              <p className="text-xs text-zinc-500">{job.company?.company_name || "Corporate Partner"}</p>
                            </div>
                            <Badge variant="outline" className="rounded-full border-zinc-200 text-[10px] font-medium dark:border-zinc-700">
                              Pass {passThreshold}%
                            </Badge>
                          </div>

                          <div className="grid gap-3 text-xs sm:grid-cols-3">
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Package</p>
                              <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatLpa(job.ctc_max)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Location</p>
                              <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{job.location}</p>
                            </div>
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Mode</p>
                              <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">{job.work_mode}</p>
                            </div>
                          </div>

                          <p className="line-clamp-3 text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                            {job.description}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {job.branches.slice(0, 4).map((branch) => (
                              <Badge
                                key={branch.branch_name}
                                variant="secondary"
                                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                {branch.branch_name}
                              </Badge>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900/30">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">Best attempt</span>
                              <span className={`font-semibold ${hasPassed ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                                {bestAttempt ? `${bestAttempt.overall_score || 0}%` : "None yet"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {bestAttempt
                                ? `Last evaluated ${formatDate(bestAttempt.completed_at)}`
                                : "No evaluated attempt for this drive yet."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${hasPassed ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/35 dark:text-amber-300"}`}
                          >
                            {hasPassed ? "Gate cleared" : "Needs mock pass"}
                          </Badge>
                          <Link href={`/student/mock/job/${mapping.id}`}>
                            <Button size="sm" className="h-9 rounded-xl px-4 text-xs font-medium">
                              {bestAttempt ? "Retake assessment" : "Take assessment"}
                              <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-3xl border-zinc-200 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <IconHistory className="h-4 w-4 text-primary" />
                Attempt history
              </CardTitle>
              <CardDescription className="text-xs leading-6">
                Review every practice and job-required interview, along with the score and current status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockInterviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                  <IconBrain className="mx-auto h-8 w-8 text-zinc-400" />
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    No mock attempts yet.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Start a practice session to see your results and feedback here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...mockInterviews]
                    .sort(
                      (a, b) =>
                        new Date(b.completed_at || b.updated_at || 0).getTime() -
                        new Date(a.completed_at || a.updated_at || 0).getTime()
                    )
                    .map((mock) => {
                      const score = mock.overall_score ?? mock.ai_score ?? 0
                      const isEvaluated = mock.status === "EVALUATED"

                      return (
                        <div
                          key={mock.id}
                          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
                                {mock.mock_type === "JOB_REQUIRED" ? "Job-required" : "Practice"}
                              </Badge>
                              <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${toneForStatus(mock.status)}`}>
                                {statusLabel(mock.status)}
                              </Badge>
                              {isEvaluated && (
                                <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${mock.passed ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-300" : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/35 dark:text-rose-300"}`}>
                                  {mock.passed ? "Passed" : "Not passed"}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{mock.job_role_context}</h3>
                              <p className="text-xs text-zinc-500">
                                {formatDate(mock.completed_at || mock.updated_at || null)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Overall score</p>
                              <p className={`text-2xl font-semibold ${scoreTone(score)}`}>{formatScore(score)}</p>
                            </div>
                            <Link href={`/student/mock/${mock.id}`}>
                              <Button variant="outline" size="sm" className="h-9 rounded-xl px-4 text-xs font-medium">
                                Open
                                <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
