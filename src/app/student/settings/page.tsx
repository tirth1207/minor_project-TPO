"use client"

import * as React from "react"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconTarget, IconEdit } from "@tabler/icons-react"

export default function StudentSettingsPage() {
  const [careerProfile, setCareerProfile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  const fetchCareerProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/students/career-profile")
      const data = await res.json()
      if (res.ok) {
        setCareerProfile(data.data?.profile ?? null)
      }
    } catch (err) {
      console.error("Failed to load career profile:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCareerProfile()
  }, [fetchCareerProfile])

  return (
    <div className="w-full max-w-4xl space-y-6">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={fetchCareerProfile}
      />

      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Student Preferences & Career Profile
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Manage your student settings, target roles, dream CTC, and AI career goals.
        </p>
      </div>

      {/* Career Profile Card */}
      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IconTarget className="h-4 w-4 text-primary" />
              Career Preferences & Goals
            </CardTitle>
            <CardDescription className="text-xs">
              These preferences drive your AI Career Roadmap and job recommendation alignment.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setOnboardingOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <IconEdit className="h-3.5 w-3.5" />
            Edit Career Goals
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 pt-6 text-xs">
          {loading ? (
            <p className="text-zinc-500 py-4 text-center">Loading career settings...</p>
          ) : !careerProfile ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-zinc-500">You haven&apos;t set up your career preferences yet.</p>
              <Button size="sm" onClick={() => setOnboardingOpen(true)} className="h-8 text-xs">
                Complete Career Onboarding
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Dream Role & Domain</span>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    {careerProfile.dream_role} ({careerProfile.dream_job})
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Target CTC</span>
                  <div className="font-bold text-primary text-sm">
                    ₹{careerProfile.dream_ctc || "—"} LPA
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Job Type & Mode</span>
                  <div className="text-zinc-800 dark:text-zinc-200">
                    {careerProfile.target_job_type} • {careerProfile.preferred_work_mode} mode
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Current Skills</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(careerProfile.current_skills || []).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Target / Dream Skills</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(careerProfile.dream_skills || []).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-medium">Target Timeline</span>
                  <div className="text-zinc-800 dark:text-zinc-200">{careerProfile.target_timeline}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
