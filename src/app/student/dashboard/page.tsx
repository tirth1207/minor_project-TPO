"use client"

import * as React from "react"
import Link from "next/link"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  IconArrowRight,
  IconBriefcase,
  IconBrain,
  IconCheck,
  IconRobot,
  IconSparkles,
  IconTarget,
} from "@tabler/icons-react"

export default function StudentDashboardPage() {
  const { profile, jobs, applications, mockInterviews } = useStudent()
  const [careerProfile, setCareerProfile] = React.useState<any>(null)
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  const loadCareerProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/students/career-profile")
      const data = await res.json()
      if (res.ok && data.data?.profile) setCareerProfile(data.data.profile)
    } catch (error) {
      console.error("Failed to fetch career profile:", error)
    }
  }, [])

  React.useEffect(() => { void loadCareerProfile() }, [loadCareerProfile])

  const eligibleJobs = jobs.filter((job) => job.is_eligible !== false)
  const requiredMockJobs = jobs.filter((job) => job.job?.require_mock)
  const evaluatedMocks = mockInterviews.filter((mock) => mock.status === "EVALUATED")
  const passedMocks = evaluatedMocks.filter((mock) => mock.passed === true)

  return (
    <div className="portal-page space-y-6 pb-8">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={loadCareerProfile}
      />

      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm md:p-7">
        <div className="absolute -right-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="secondary" className="gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium">
              <IconSparkles className="size-3.5 text-primary" />
              Placement Intelligence
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Welcome back, {profile?.name?.split(" ")[0] || "Candidate"}.
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your placement command center. See what needs attention, discover relevant drives, and keep your preparation moving.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">{profile?.branch || "Branch not set"}</span>
              <span className="rounded-full bg-muted px-2.5 py-1">CGPA {profile?.cgpa ?? "—"}</span>
              <span className="rounded-full bg-muted px-2.5 py-1">{profile?.active_backlogs ?? 0} active backlogs</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/jobs">
              <Button className="gap-2">Explore jobs <IconArrowRight className="size-4" /></Button>
            </Link>
            <Link href="/student/roadmap">
              <Button variant="outline" className="gap-2"><IconBrain className="size-4" /> Career roadmap</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Eligible drives", value: eligibleJobs.length, hint: "Matches your academic criteria", icon: IconBriefcase, href: "/student/jobs" },
          { label: "Applications", value: applications.length, hint: "Recruitment pipelines", icon: IconArrowRight, href: "/student/applications" },
          { label: "Assessments", value: requiredMockJobs.length, hint: "Job mocks currently required", icon: IconRobot, href: "/student/mock" },
          { label: "Mocks completed", value: evaluatedMocks.length, hint: `${passedMocks.length} passed so far`, icon: IconCheck, href: "/student/mock" },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Link href={metric.href} key={metric.label} className="group">
              <Card className="portal-interactive h-full rounded-xl border-border/70">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-4" /></span>
                    <IconArrowRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight">{metric.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{metric.hint}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="rounded-xl border-border/70">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="portal-section-title flex items-center gap-2"><IconTarget className="size-4 text-primary" /> Your career direction</CardTitle>
              <CardDescription className="portal-section-description mt-1">Your goals shape the jobs and roadmap we surface.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setOnboardingOpen(true)}>Edit goals</Button>
          </CardHeader>
          <CardContent>
            {careerProfile ? (
              <div className="space-y-5">
                <div className="portal-muted-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold">{careerProfile.dream_role || "Target role not set"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{careerProfile.dream_job || "Choose a target job to personalize recommendations."}</p>
                  </div>
                  <Badge variant="secondary" className="w-fit">₹{careerProfile.dream_ctc || "—"} LPA target</Badge>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Priority skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(careerProfile.dream_skills || []).slice(0, 6).map((skill: string) => <Badge key={skill} variant="outline" className="rounded-full text-[10px]">{skill}</Badge>)}
                  </div>
                </div>
                <Link href="/student/roadmap"><Button className="w-full gap-2">Open personalized roadmap <IconArrowRight className="size-4" /></Button></Link>
              </div>
            ) : (
              <div className="portal-muted-panel flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary"><IconBrain className="size-5" /></div>
                <p className="mt-3 font-medium">Set your career goals</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Tell us your target role, skills, and CTC so your roadmap becomes genuinely useful.</p>
                <Button size="sm" className="mt-4" onClick={() => setOnboardingOpen(true)}>Set preferences</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="portal-section-title flex items-center gap-2"><IconRobot className="size-4 text-primary" /> Next assessments</CardTitle>
            <CardDescription className="portal-section-description mt-1">Finish required mocks before applying to gated drives.</CardDescription>
          </CardHeader>
          <CardContent>
            {requiredMockJobs.length === 0 ? (
              <div className="portal-muted-panel p-7 text-center">
                <IconCheck className="mx-auto size-5 text-emerald-500" />
                <p className="mt-2 text-sm font-medium">You’re all clear</p>
                <p className="mt-1 text-xs text-muted-foreground">No active drive currently needs a mandatory mock.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requiredMockJobs.slice(0, 4).map((item) => {
                  const job = item.job!
                  const mapping = item.mapping!
                  const attempts = mockInterviews.filter((mock) => mock.job_college_mapping_id === mapping.id && mock.mock_type === "JOB_REQUIRED" && mock.status === "EVALUATED")
                  const best = [...attempts].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]
                  const score = best?.overall_score ?? best?.ai_score ?? null
                  const passScore = job.mock_pass_score || 70
                  const passed = score !== null && score >= passScore && best?.passed !== false
                  return (
                    <div key={mapping.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{job.title}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{job.company?.company_name || "Corporate partner"} · Pass {passScore}%</p></div>
                      {passed ? <Badge variant="outline" className="shrink-0 gap-1 text-emerald-600"><IconCheck className="size-3" /> Passed</Badge> : <Link href={`/student/mock/job/${mapping.id}`}><Button size="sm" variant="outline" className="shrink-0 text-xs">{score !== null ? "Retake" : "Start"}</Button></Link>}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
