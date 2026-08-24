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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  IconBrain,
  IconBriefcase,
  IconHistory,
  IconSparkles,
  IconCheck,
  IconX,
  IconArrowRight,
  IconLock,
} from "@tabler/icons-react"

export default function StudentMockHubPage() {
  const router = useRouter()
  const { jobs, mockInterviews, refreshMockInterviews } = useStudent()

  const [selectedRole, setSelectedRole] = React.useState("Full Stack Developer")
  const [startingPractice, setStartingPractice] = React.useState(false)

  // Filter required job assessments
  const requiredJobPostings = jobs.filter((j) => j.job?.require_mock)

  // Compute skill progress metrics from practice and job mock history
  const skillMetrics: Record<string, { total: number; count: number }> = {}
  mockInterviews.forEach((m) => {
    if (m.skill_scores && typeof m.skill_scores === "object") {
      Object.entries(m.skill_scores).forEach(([skill, score]) => {
        const num = Number(score)
        if (!isNaN(num)) {
          if (!skillMetrics[skill]) skillMetrics[skill] = { total: 0, count: 0 }
          skillMetrics[skill].total += num
          skillMetrics[skill].count += 1
        }
      })
    }
  })

  const averageSkillScores = Object.entries(skillMetrics).map(([skill, data]) => ({
    skill,
    score: Math.round(data.total / data.count),
  })).sort((a, b) => b.score - a.score)

  const handleStartPractice = async () => {
    if (!selectedRole.trim()) return
    setStartingPractice(true)
    try {
      const res = await fetch("/api/students/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      })
      const data = await res.json()
      if (res.ok && data.mock?.id) {
        await refreshMockInterviews()
        router.push(`/student/mock/${data.mock.id}`)
      }
    } catch (err) {
      console.error("Error starting practice mock:", err)
    } finally {
      setStartingPractice(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white dark:border-zinc-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
              <IconSparkles className="h-3 w-3" />
              Placement AI Prep Engine
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              AI Interview Preparation & Job Assessments
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              Master technical MCQs, core theory, and coding questions tailored specifically to company job drives or practice freely for your target career.
            </p>
          </div>

          <Link href="/student/roadmap">
            <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5 bg-white text-zinc-900 hover:bg-zinc-100">
              <IconBrain className="h-3.5 w-3.5 text-primary" />
              View Career Roadmap
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Tabs Hub */}
      <Tabs defaultValue="practice" className="w-full space-y-5">
        <TabsList className="grid w-full grid-cols-3 max-w-md h-9 text-xs">
          <TabsTrigger value="practice" className="gap-1.5">
            <IconSparkles className="h-3.5 w-3.5" />
            Practice Hub
          </TabsTrigger>
          <TabsTrigger value="job-assessments" className="gap-1.5">
            <IconBriefcase className="h-3.5 w-3.5" />
            Job Assessments
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <IconHistory className="h-3.5 w-3.5" />
            Attempt History
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Practice Mode */}
        <TabsContent value="practice" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Practice Setup Card */}
            <Card className="md:col-span-2 rounded-xl border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <IconSparkles className="h-4 w-4 text-primary" />
                  Mode A — Practice Interview
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate unlimited AI preparation tests containing MCQs, theory rubrics, and technical code challenges. Does not satisfy job gate requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Target Role or Domain
                  </label>
                  <Input
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="e.g. Frontend Developer, Full Stack Engineer, Python Developer"
                    className="h-9 text-xs"
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
                      className="h-6 rounded-full text-[10px]"
                    >
                      {role}
                    </Button>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleStartPractice}
                    disabled={startingPractice || !selectedRole.trim()}
                    className="h-9 w-full sm:w-auto text-xs gap-1.5"
                  >
                    {startingPractice ? "Generating Assessment..." : "Start Practice Session"}
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Skill Performance Sidebar */}
            <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold">Skill Performance Analytics</CardTitle>
                <CardDescription className="text-[11px]">Aggregated mock score across topics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {averageSkillScores.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center">
                    No mock test performance recorded yet.
                  </p>
                ) : (
                  averageSkillScores.slice(0, 5).map((item) => (
                    <div key={item.skill} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.skill}</span>
                        <span className="font-semibold text-primary">{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-1.5" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Job Assessments (JOB_REQUIRED) */}
        <TabsContent value="job-assessments" className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <IconBriefcase className="h-4 w-4 text-amber-500" />
                Company Required Job Assessments
              </h3>
              <p className="text-xs text-zinc-500">
                These company drives require you to pass a job-specific AI assessment before submitting your application.
              </p>
            </div>

            {requiredJobPostings.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No active placement drives currently require mandatory mock assessments.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {requiredJobPostings.map((item) => {
                  const job = item.job!
                  const mapping = item.mapping!

                  // Find student's best JOB_REQUIRED attempt for this mapping
                  const attempts = mockInterviews.filter(
                    (m) => m.job_college_mapping_id === mapping.id && m.mock_type === "JOB_REQUIRED" && m.status === "EVALUATED"
                  )
                  const bestAttempt = attempts.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]

                  const passThreshold = job.mock_pass_score || 70
                  const isPassed = Boolean(bestAttempt && (bestAttempt.overall_score ?? 0) >= passThreshold)

                  return (
                    <div
                      key={mapping.id}
                      className="flex flex-col justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{job.title}</h4>
                            <p className="text-[11px] text-zinc-500">{job.company?.company_name || "Corporate Partner"}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Passing: {passThreshold}%
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                          <div>
                            Status:{" "}
                            {bestAttempt ? (
                              isPassed ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Passed ✓</span>
                              ) : (
                                <span className="font-semibold text-rose-600 dark:text-rose-400">Needs Improvement</span>
                              )
                            ) : (
                              <span className="font-medium text-zinc-500">Not Attempted</span>
                            )}
                          </div>
                          <div>
                            Your Best Score:{" "}
                            <span className="font-semibold">{bestAttempt?.overall_score ?? "—"}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">
                          {attempts.length} Attempt{attempts.length === 1 ? "" : "s"} recorded
                        </span>
                        <Link href={`/student/mock/job/${mapping.id}`}>
                          <Button size="sm" variant={isPassed ? "outline" : "default"} className="h-7 text-xs">
                            {isPassed ? "Retake Assessment" : bestAttempt ? "Retake Assessment" : "Take Job Mock"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Attempt History */}
        <TabsContent value="history" className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-semibold mb-4">Historical Mock Assessment Records</h3>
            {mockInterviews.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">No completed mock assessments found.</p>
            ) : (
              <div className="space-y-3">
                {mockInterviews.map((mock) => (
                  <div
                    key={mock.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-xs dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{mock.job_role_context}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {mock.mock_type || "PRACTICE"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Completed on {mock.completed_at ? new Date(mock.completed_at).toLocaleDateString() : "In progress"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-primary text-sm">{mock.overall_score ?? mock.ai_score ?? 0}%</div>
                        <div className="text-[10px] text-zinc-500">Overall Score</div>
                      </div>

                      <Link href={`/student/mock/${mock.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px]">
                          View Report
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
