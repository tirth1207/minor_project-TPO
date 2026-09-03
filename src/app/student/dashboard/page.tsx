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
  IconFileCertificate,
  IconRobot,
  IconSparkles,
  IconArrowRight,
  IconTarget,
  IconCheck,
  IconClock,
} from "@tabler/icons-react"

export default function StudentDashboardPage() {
  const { profile, jobs, applications, mockInterviews } = useStudent()
  const [careerProfile, setCareerProfile] = React.useState<any>(null)
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  React.useEffect(() => {
    async function fetchCareerProfile() {
      try {
        const res = await fetch("/api/students/career-profile")
        const data = await res.json()
        if (res.ok && data.data?.profile) {
          setCareerProfile(data.data.profile)
        }
      } catch (err) {
        console.error("Failed to fetch career profile:", err)
      }
    }
    fetchCareerProfile()
  }, [])

  // Eligible jobs count
  const eligibleJobsCount = jobs.filter((j) => j.is_eligible !== false).length

  // Jobs requiring AI mock
  const requiredMockJobs = jobs.filter((j) => j.job?.require_mock)

  return (
    <div className="w-full space-y-6">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={async () => {
          const res = await fetch("/api/students/career-profile")
          const data = await res.json()
          if (data.data?.profile) setCareerProfile(data.data.profile)
        }}
      />

      {/* Welcome Hero Card */}
      <div className="rounded-2xl bg-white p-6 text-black dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
              <IconSparkles className="h-3.5 w-3.5" />
              TPO Placement Intelligence
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Welcome back, {profile?.name || "Candidate"}!
            </h1>
            <p className="text-xs text-zinc-400 max-w-lg">
              Branch: <span className="font-semibold text-zinc-200">{profile?.branch || "N/A"}</span> • CGPA: <span className="font-semibold text-zinc-200">{profile?.cgpa || "—"}</span> • Active Backlogs: <span className="font-semibold text-zinc-200">{profile?.active_backlogs ?? 0}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/student/roadmap">
              <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5 bg-white text-zinc-900 hover:bg-zinc-100">
                <IconBrain className="h-3.5 w-3.5 text-primary" />
                AI Career Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px]">Eligible Jobs</CardDescription>
            <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {eligibleJobsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[10px] text-zinc-400">Active campus drives matching criteria</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px]">Applications Submitted</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {applications.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[10px] text-zinc-400">In active recruitment pipelines</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px]">Required Job Mocks</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {requiredMockJobs.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[10px] text-zinc-400">Company drives requiring AI pass score</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px]">Completed AI Assessments</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {mockInterviews.filter((m) => m.status === "EVALUATED").length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[10px] text-zinc-400">Evaluated practice & job tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Career Readiness Widget */}
        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <IconTarget className="h-4 w-4 text-primary" />
                Career Readiness Snapshot
              </CardTitle>
              <CardDescription className="text-xs">
                AI alignment with your target career goals
              </CardDescription>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOnboardingOpen(true)}
              className="h-7 text-[11px]"
            >
              Edit Preferences
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            {careerProfile ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">{careerProfile.dream_role}</div>
                    <div className="text-[11px] text-zinc-500">{careerProfile.dream_job}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Target: ₹{careerProfile.dream_ctc || "—"} LPA
                  </Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-500 font-medium">Target Skills:</span>
                  <div className="flex flex-wrap gap-1">
                    {(careerProfile.dream_skills || []).slice(0, 5).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/student/roadmap">
                    <Button size="sm" className="w-full h-8 text-xs gap-1.5">
                      View Full AI Career Roadmap
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-zinc-500">Initialize your career trajectory to receive personalized AI recommendations.</p>
                <Button size="sm" onClick={() => setOnboardingOpen(true)} className="h-8 text-xs">
                  Setup Career Preferences
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required Assessments Widget */}
        <Card className="rounded-xl border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IconRobot className="h-4 w-4 text-amber-500" />
              Company Job Assessment Gates
            </CardTitle>
            <CardDescription className="text-xs">
              Drives requiring a job-specific AI mock test before applying
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            {requiredMockJobs.length === 0 ? (
              <p className="text-zinc-500 py-6 text-center">No current job drives require mandatory mock assessments.</p>
            ) : (
              requiredMockJobs.slice(0, 3).map((item) => {
                const job = item.job!
                const mapping = item.mapping!

                // Find best attempt
                const attempts = mockInterviews.filter(
                  (m) => m.job_college_mapping_id === mapping.id && m.mock_type === "JOB_REQUIRED" && m.status === "EVALUATED"
                )
                const bestAttempt = attempts.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]
                const bestScore = bestAttempt?.overall_score ?? bestAttempt?.ai_score ?? null
                const passScore = job.mock_pass_score || 70
                const passed = Boolean(bestScore !== null && bestScore >= passScore && bestAttempt?.passed !== false)

                return (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{job.title}</div>
                      <div className="text-[10px] text-zinc-500">{job.company?.company_name || "Corporate Partner"}</div>
                      <div className="text-[10px] text-zinc-400">Passing Score: {passScore}% • Best: {bestScore !== null ? `${bestScore}%` : "Not taken"}</div>
                    </div>

                    <Link href={`/student/mock/job/${mapping.id}`}>
                      <Button size="sm" variant={passed ? "outline" : "default"} className="h-7 text-[11px] gap-1">
                        {passed ? "Passed ✓" : "Take Mock"}
                      </Button>
                    </Link>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
