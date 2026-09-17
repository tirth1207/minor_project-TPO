"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconSparkles } from "@tabler/icons-react"
import { AnalyticsBars, AnalyticsDonut } from "@/components/dashboard-analytics"

interface CareerProfile {
  dream_role?: string
  dream_job?: string
}

export default function StudentDashboardPage() {
  const { profile, jobs, applications, mockInterviews } = useStudent()
  const [careerProfile, setCareerProfile] = React.useState<CareerProfile | null>(
    null
  )
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  const loadCareerProfile = React.useCallback(async () => {
    try {
      const response = await fetch("/api/students/career-profile")
      const data = await response.json()
      if (response.ok && data.data?.profile) {
        setCareerProfile(data.data.profile)
      }
    } catch (e) {
      console.error("Failed to load career profile", e)
    }
  }, [])

  React.useEffect(() => {
    void loadCareerProfile()
  }, [loadCareerProfile])

  const eligible = jobs.filter((j) => j.is_eligible !== false).length
  const evaluated = mockInterviews.filter((m) => m.status === "EVALUATED")
  const passed = evaluated.filter((m) => m.passed === true).length

  const statuses = [
    "APPLIED",
    "SHORTLISTED",
    "OFFERED",
    "REJECTED",
    "WITHDRAWN",
  ].map((label) => ({
    label,
    value: applications.filter((a) => a.status === label).length,
  }))

  return (
    <div className="space-y-6 pb-8">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={loadCareerProfile}
      />

      <section className="rounded-2xl border bg-card p-6">
        <Badge variant="secondary" className="gap-1.5">
          <IconSparkles className="size-3.5 text-primary" />
          Placement Intelligence
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold">
          Welcome back, {profile?.name?.split(" ")[0] || "Candidate"}.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your live placement command center with real application and assessment data.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">
            {profile?.branch || "Branch not set"}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1">
            CGPA {profile?.cgpa ?? "—"}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1">
            {profile?.active_backlogs ?? 0} backlogs
          </span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Eligible drives", eligible],
          ["Applications", applications.length],
          ["Mocks evaluated", evaluated.length],
          ["Mocks passed", passed],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="mt-6">
              <p className="text-xs text-muted-foreground">{String(label)}</p>
              <p className="mt-1 text-3xl font-semibold">{value as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsDonut
          title="Application status"
          description="Your current application pipeline."
          data={statuses}
        />
        <AnalyticsBars
          title="Assessment performance"
          description="Evaluated mock interview outcomes."
          data={[
            { label: "Passed", value: passed },
            {
              label: "Not passed",
              value: Math.max(evaluated.length - passed, 0),
            },
            {
              label: "Pending / other",
              value: Math.max(mockInterviews.length - evaluated.length, 0),
            },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Career direction</CardTitle>
            <CardDescription>
              Your stored career profile from Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {careerProfile ? (
              <>
                <p className="text-lg font-semibold">
                  {careerProfile.dream_role || "Target role not set"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {careerProfile.dream_job || "No target job set"}
                </p>
              </>
            ) : (
              <Button onClick={() => setOnboardingOpen(true)}>
                Set career goals
              </Button>
            )}
          </CardContent>
        </Card>

        <AnalyticsBars
          title="Job eligibility"
          description="Current jobs classified by eligibility."
          data={[
            { label: "Eligible", value: eligible },
            {
              label: "Not eligible",
              value: Math.max(jobs.length - eligible, 0),
            },
          ]}
        />
      </div>
    </div>
  )
}
