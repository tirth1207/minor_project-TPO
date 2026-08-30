"use client"

import * as React from "react"
import Link from "next/link"

import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBrain,
  IconBriefcase,
  IconBook,
  IconCheck,
  IconInfoCircle,
  IconRefresh,
  IconSparkles,
  IconTarget,
  IconPlaneDeparture,
  IconCircleCheck,
  IconMapPin,
} from "@tabler/icons-react"

import type { CareerRoadmapData } from "@/types/career"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface RoadmapApiResponse {
  success?: boolean
  data?: {
    roadmap?: CareerRoadmapData
    onboardingRequired?: boolean
  }
  roadmap?: CareerRoadmapData
  onboardingRequired?: boolean
  error?: string
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeRoadmap(payload: RoadmapApiResponse): CareerRoadmapData | null {
  const data = payload?.data

  if (data?.roadmap) {
    return data.roadmap
  }

  if (payload?.roadmap) {
    return payload.roadmap
  }

  if (payload && "readiness" in payload && "careerGoal" in payload) {
    return payload as unknown as CareerRoadmapData
  }

  return null
}

/* Tiered color system — reused across the gauge, badges and job cards so
   "58%" always reads the same everywhere on the page. */
function getReadinessTier(score: number) {
  if (score >= 85) {
    return {
      label: "Excellent",
      stroke: "#10b981",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
    }
  }

  if (score >= 70) {
    return {
      label: "Strong",
      stroke: "#3b82f6",
      badge:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400",
    }
  }

  if (score >= 50) {
    return {
      label: "Developing",
      stroke: "#f59e0b",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    }
  }

  return {
    label: "Needs Improvement",
    stroke: "#f43f5e",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400",
  }
}

function getPriorityClass(priority?: string) {
  switch (priority) {
    case "HIGH":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
    case "LOW":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400"
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
  }
}

function getMatchBorderClass(score?: number) {
  const s = score ?? 0
  if (s >= 80) return "border-l-emerald-500"
  if (s >= 60) return "border-l-blue-500"
  return "border-l-amber-500"
}

/* -------------------------------------------------------------------------- */
/* Readiness gauge (signature element)                                       */
/* -------------------------------------------------------------------------- */

function ReadinessGauge({ score }: { score: number }) {
  const size = 140
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference
  const tier = getReadinessTier(clamped)

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tier.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-white">
          {clamped}%
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Ready
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentCareerRoadmapPage() {
  const [roadmap, setRoadmap] = React.useState<CareerRoadmapData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  const fetchRoadmap = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/students/career-roadmap", {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })

      const json: RoadmapApiResponse = await response.json()

      if (!response.ok) {
        setError(json?.error || "Failed to load your career roadmap.")
        return
      }

      const payload = json?.data || json

      if (payload?.onboardingRequired) {
        setRoadmap(null)
        setOnboardingOpen(true)
        return
      }

      const normalizedRoadmap = normalizeRoadmap(json)

      if (!normalizedRoadmap) {
        setRoadmap(null)
        setError("Career roadmap data was not returned by the server.")
        return
      }

      setRoadmap(normalizedRoadmap)
    } catch (err: any) {
      setError(err?.message || "An unexpected network error occurred.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRoadmap()
  }, [fetchRoadmap])

  const handleRefresh = async () => {
    if (refreshing) return

    setRefreshing(true)
    setError(null)

    try {
      const response = await fetch("/api/students/career-roadmap/refresh", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })

      const json: RoadmapApiResponse = await response.json()

      if (!response.ok) {
        setError(json?.error || "Failed to refresh your career roadmap.")
        return
      }

      const normalizedRoadmap = normalizeRoadmap(json)

      if (!normalizedRoadmap) {
        setError("The roadmap refreshed, but no data came back. Try again in a moment.")
        return
      }

      setRoadmap(normalizedRoadmap)
    } catch (err: any) {
      setError(err?.message || "Failed to refresh career roadmap.")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <IconBrain className="h-8 w-8 animate-pulse text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Loading your career roadmap</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Analyzing your skills, goals and placement opportunities...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={fetchRoadmap}
      />

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex min-w-0 items-start gap-3">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                Couldn't load your roadmap
              </p>
              <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-400">
                {error}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={fetchRoadmap}>
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setOnboardingOpen(true)}
            >
              Edit Goals
            </Button>
          </div>
        </div>
      )}

      {!roadmap && !error && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md text-center">
            <IconBrain className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">Set your target to get a roadmap</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us the role and CTC you're aiming for, and we'll build a
              personalized plan from your skills and mock interview history.
            </p>
            <Button className="mt-5" onClick={() => setOnboardingOpen(true)}>
              Set Career Goals
            </Button>
          </div>
        </div>
      )}

      {roadmap && (
        <CareerRoadmap
          roadmap={roadmap}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEditGoals={() => setOnboardingOpen(true)}
        />
      )}
    </div>
  )
}

/* ========================================================================== */
/* Career Roadmap                                                             */
/* ========================================================================== */

interface CareerRoadmapProps {
  roadmap: CareerRoadmapData
  refreshing: boolean
  onRefresh: () => void
  onEditGoals: () => void
}

function CareerRoadmap({ roadmap, refreshing, onRefresh, onEditGoals }: CareerRoadmapProps) {
  const readinessScore = Number(roadmap?.readiness?.score ?? 0)
  const readinessSummary =
    roadmap?.readiness?.summary || "No readiness analysis is available yet."

  const careerGoal = roadmap?.careerGoal
  const skillGaps = Array.isArray(roadmap?.skillGaps) ? roadmap.skillGaps : []
  const strengths = Array.isArray(roadmap?.strengths) ? roadmap.strengths : []
  const learningPlan = Array.isArray(roadmap?.learningPlan) ? roadmap.learningPlan : []
  const recommendedJobs = Array.isArray(roadmap?.recommendedJobs) ? roadmap.recommendedJobs : []

  const tier = getReadinessTier(readinessScore)

  return (
    <div className="w-full space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Hero — readiness is the story on this page, so it's the focal point */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white sm:p-8">

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-300">
              <IconSparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Career Intelligence
            </div>

            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Career Roadmap
            </h1>

            <p className="mt-2 max-w-md text-xs leading-5 text-zinc-400">
              A personalized plan based on your current skills, career goals,
              learning gaps and active placement opportunities.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onEditGoals}
                className="h-8 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-900 hover:text-white"
              >
                Edit Goals
              </Button>

              <Button
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-8 gap-1.5 bg-white text-xs text-zinc-900 hover:bg-zinc-100"
              >
                <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh Roadmap"}
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 border-t border-zinc-800 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <ReadinessGauge score={readinessScore} />

            <div className="max-w-[200px]">
              <Badge variant="outline" className={`text-[10px] ${tier.badge} border-opacity-100`}>
                {tier.label}
              </Badge>
              <p className="mt-2 text-[11px] leading-5 text-zinc-400">
                {readinessSummary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Career Goal — boarding-pass style ticket                          */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden rounded-xl p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex items-center gap-4 p-5 sm:w-[46%]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <IconPlaneDeparture className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Dream Role</p>
              <p className="mt-0.5 truncate text-lg font-semibold">
                {careerGoal?.dreamRole || "Not specified"}
              </p>
              <p className="text-xs text-muted-foreground">
                {careerGoal?.dreamJob || "Software Engineer"}
              </p>
            </div>
          </div>

          {/* perforated divider */}
          <div className="relative hidden w-px shrink-0 border-l border-dashed border-border sm:block">
            <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-background" />
            <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-background" />
          </div>
          <div className="border-t border-dashed border-border sm:hidden" />

          <div className="grid flex-1 grid-cols-2 divide-x divide-border">
            <div className="flex flex-col justify-center p-5">
              <p className="text-[10px] text-muted-foreground">Target CTC</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                {careerGoal?.targetCtc ? `₹${careerGoal.targetCtc} LPA` : "—"}
              </p>
            </div>
            <div className="flex flex-col justify-center p-5">
              <p className="text-[10px] text-muted-foreground">Timeline</p>
              <p className="mt-1 text-lg font-semibold">
                {careerGoal?.targetTimeline || "—"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Strengths                                                          */}
      {/* ------------------------------------------------------------------ */}

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconCircleCheck className="h-4 w-4 text-emerald-500" />
            Your Strengths
          </CardTitle>
          <CardDescription className="text-xs">
            Skills where your mock interview performance is already strong.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {strengths.length === 0 ? (
            <p className="py-5 text-center text-xs text-muted-foreground">
              No strengths identified yet — complete a mock interview to see them here.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {strengths.map((strength, index) => (
                <div
                  key={`${strength.skill}-${index}`}
                  className="rounded-xl border border-l-4 border-l-emerald-500 p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                      <IconCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="truncate text-sm font-semibold">{strength.skill}</span>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    {strength.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Skill Gaps                                                         */}
      {/* ------------------------------------------------------------------ */}

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconBrain className="h-4 w-4 text-primary" />
            Skill Gap Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            The highest-impact skills to improve to reach your target.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {skillGaps.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <IconCircleCheck className="mx-auto h-6 w-6 text-emerald-500" />
              <p className="mt-2 text-xs font-medium">No major skill gaps identified.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {skillGaps.map((gap, index) => (
                <div key={`${gap.skill}-${index}`} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{gap.skill}</h3>
                    <Badge
                      variant="outline"
                      className={`shrink-0 gap-1 text-[9px] ${getPriorityClass(gap.priority)}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {gap.priority || "MEDIUM"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px]">
                    <span className="rounded-md bg-muted px-2 py-1">
                      {gap.currentLevel || "Beginner"}
                    </span>
                    <IconArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                      {gap.requiredLevel || "Intermediate"}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                    {gap.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Learning Plan — connected timeline, since phases are sequential   */}
      {/* ------------------------------------------------------------------ */}

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconBook className="h-4 w-4 text-primary" />
            Learning Roadmap
          </CardTitle>
          <CardDescription className="text-xs">
            Follow these phases in order to close your highest-priority gaps.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {learningPlan.length === 0 ? (
            <p className="py-5 text-center text-xs text-muted-foreground">
              No learning plan is currently available.
            </p>
          ) : (
            <div className="relative space-y-6">
              <div
                className="absolute bottom-4 left-4 top-4 w-px bg-border"
                aria-hidden="true"
              />

              {learningPlan.map((phase, index) => (
                <div key={`${phase.phase}-${index}`} className="relative flex gap-4 pl-0">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{phase.phase}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(phase.skills || []).map((skill, skillIndex) => (
                            <Badge
                              key={`${skill}-${skillIndex}`}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Badge variant="outline" className="w-fit shrink-0 text-[10px]">
                        {phase.duration || "Flexible"}
                      </Badge>
                    </div>

                    {(phase.topics || []).length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Topics
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {phase.topics.map((topic, topicIndex) => (
                            <span
                              key={`${topic}-${topicIndex}`}
                              className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-[11px]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(phase.practiceTasks || []).length > 0 && (
                      <div className="mt-5">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Practice
                        </p>
                        <div className="space-y-2">
                          {phase.practiceTasks.map((task, taskIndex) => (
                            <div
                              key={`${task}-${taskIndex}`}
                              className="flex items-start gap-2 rounded-lg bg-muted/30 p-3"
                            >
                              <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <p className="text-[11px] leading-5 text-muted-foreground">
                                {task}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Recommended Jobs                                                   */}
      {/* ------------------------------------------------------------------ */}

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconBriefcase className="h-4 w-4 text-primary" />
            Recommended Placement Opportunities
          </CardTitle>
          <CardDescription className="text-xs">
            Active campus opportunities matched against your roadmap.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {recommendedJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-7 text-center">
              <IconInfoCircle className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-xs font-medium">No matching opportunities right now.</p>
              <p className="mx-auto mt-1 max-w-md text-[11px] text-muted-foreground">
                New placement drives will show up here as soon as they match
                your profile and eligibility.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedJobs.map((job, index) => (
                <div
                  key={job.jobMappingId || job.jobId || `${job.title}-${index}`}
                  className={`rounded-xl border border-l-4 p-4 transition-colors hover:bg-muted/20 ${getMatchBorderClass(job.matchScore)}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{job.title}</h3>
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[10px] tabular-nums text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                        >
                          {job.matchScore}% Match
                        </Badge>
                        {job.requireMock && (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400"
                          >
                            Mock Required
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {job.companyName || "Company"}
                        </span>
                        <span className="tabular-nums">
                          {job.ctcMax ? `₹${job.ctcMax} LPA` : "CTC not specified"}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconMapPin className="h-3 w-3" />
                          {job.location || "Location not specified"}
                        </span>
                      </div>

                      {job.readiness && (
                        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                          {job.readiness}
                        </p>
                      )}

                      {(job.skillGaps || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Gap:</span>
                          {job.skillGaps.map((gap, gapIndex) => (
                            <Badge key={`${gap}-${gapIndex}`} variant="secondary" className="text-[9px]">
                              {gap}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {job.requireMock ? (
                        <Link href={`/student/mock/job/${job.jobMappingId}`}>
                          <Button size="sm" className="h-8 gap-1.5 text-xs">
                            Take Job Mock
                            <IconArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/student/jobs">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                            View Drive
                            <IconArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}