"use client"

import * as React from "react"
import Link from "next/link"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  IconBrain,
  IconBriefcase,
  IconRefresh,
  IconSparkles,
  IconAlertTriangle,
  IconArrowRight,
  IconTarget,
  IconBook,
  IconInfoCircle,
} from "@tabler/icons-react"
import type { CareerRoadmapData } from "@/types/career"

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
      const res = await fetch("/api/students/career-roadmap")
      const json = await res.json()

      if (res.ok) {
        const payload = json.data || json
        if (payload.onboardingRequired) {
          setOnboardingOpen(true)
        } else if (payload.roadmap) {
          setRoadmap(payload.roadmap)
        }
      } else {
        setError(json.error || "Failed to load career roadmap.")
      }
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
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch("/api/students/career-roadmap/refresh", {
        method: "POST",
      })
      const json = await res.json()
      const payload = json.data || json
      if (res.ok && payload.roadmap) {
        setRoadmap(payload.roadmap)
      } else {
        setError(json.error || "Failed to refresh roadmap.")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to refresh roadmap.")
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center space-y-2 flex-col">
        <IconBrain className="h-8 w-8 animate-pulse text-primary" />
        <p className="text-xs text-zinc-500 font-medium">Generating Grounded AI Career Trajectory...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Onboarding Dialog */}
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={fetchRoadmap}
      />

      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white dark:border-zinc-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
              <IconBrain className="h-3.5 w-3.5" />
              Grounded AI Career Intelligence
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Personalized Career Trajectory & Learning Roadmap
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              From where you are today → to your target dream role: grounded strictly in actual active campus job drives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOnboardingOpen(true)}
              className="h-8 text-xs border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white"
            >
              Edit Career Goals
            </Button>
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 text-xs gap-1.5 bg-white text-zinc-900 hover:bg-zinc-100"
            >
              <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh Roadmap"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={fetchRoadmap} className="h-7 text-xs">
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOnboardingOpen(true)} className="h-7 text-xs">
              Complete Onboarding
            </Button>
          </div>
        </div>
      )}

      {roadmap && (
        <div className="space-y-6">
          {/* Top Goal & Readiness Overview */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Career Goal Card */}
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                  <IconTarget className="h-4 w-4 text-primary" />
                  Target Career Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>
                  <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {roadmap.careerGoal.dreamRole}
                  </div>
                  <div className="text-zinc-500">{roadmap.careerGoal.dreamJob}</div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Target CTC:</span>
                  <span className="font-bold text-primary">₹{roadmap.careerGoal.targetCtc || "—"} LPA</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Target Timeline:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{roadmap.careerGoal.targetTimeline || "3 months"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Readiness Index */}
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800 md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                    <IconSparkles className="h-4 w-4 text-amber-500" />
                    Career Placement Readiness Index
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-bold text-primary">
                    {roadmap.readiness.score}% Readiness Score
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <Progress value={roadmap.readiness.score} className="h-2" />
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {roadmap.readiness.summary}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Skill Gap Matrix */}
          <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IconBrain className="h-4 w-4 text-primary" />
                Target Skill Gap Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Key missing or weak skills identified for your target roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roadmap.skillGaps.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No skill gaps identified yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {roadmap.skillGaps.map((gap, i) => (
                    <div key={i} className="rounded-xl border border-zinc-200 p-3.5 text-xs dark:border-zinc-800 space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{gap.skill}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            gap.priority === "HIGH"
                              ? "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                              : "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                          }`}
                        >
                          {gap.priority} PRIORITY
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Level: <span className="font-medium text-zinc-700 dark:text-zinc-300">{gap.currentLevel}</span> → Target: <span className="font-medium text-zinc-700 dark:text-zinc-300">{gap.requiredLevel}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1 leading-snug">
                        {gap.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phased Learning Roadmap */}
          <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IconBook className="h-4 w-4 text-primary" />
                Phased AI Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roadmap.learningPlan.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">No learning phases currently configured.</p>
              ) : (
                roadmap.learningPlan.map((phase, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{phase.phase}</h4>
                      <Badge variant="secondary" className="text-[10px]">{phase.duration}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {phase.topics.map((t, i) => (
                        <span key={i} className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                          • {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Grounded Job Recommendations */}
          <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IconBriefcase className="h-4 w-4 text-primary" />
                Grounded Campus Drive Recommendations
              </CardTitle>
              <CardDescription className="text-xs">
                Real active jobs available in your college placement portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roadmap.recommendedJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-800 space-y-2">
                  <IconInfoCircle className="mx-auto h-6 w-6 text-zinc-400" />
                  <p className="text-xs text-zinc-500">
                    No active campus placement drives currently match your target role or eligibility criteria.
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Check back soon when new placement drives are announced by your TPO.
                  </p>
                </div>
              ) : (
                roadmap.recommendedJobs.map((rec) => (
                  <div
                    key={rec.jobMappingId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{rec.title}</span>
                        <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {rec.matchScore}% Match
                        </Badge>
                        {rec.requireMock && (
                          <Badge variant="outline" className="text-[9px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Mock Required
                          </Badge>
                        )}
                      </div>

                      <p className="text-zinc-500">{rec.companyName} • ₹{rec.ctcMax} LPA • {rec.location}</p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">{rec.readiness}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {rec.requireMock ? (
                        <Link href={`/student/mock/job/${rec.jobMappingId}`}>
                          <Button size="sm" className="h-8 text-xs gap-1">
                            Take Job Mock
                            <IconArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/student/jobs">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                            View Drive
                            <IconArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
