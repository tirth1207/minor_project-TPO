"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { IconSparkles, IconCheck, IconArrowRight, IconArrowLeft, IconAlertTriangle } from "@tabler/icons-react"

interface StudentCareerOnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function StudentCareerOnboardingDialog({
  open,
  onOpenChange,
  onCompleted,
}: StudentCareerOnboardingDialogProps) {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Form State
  const [dreamJob, setDreamJob] = React.useState("Software Engineer")
  const [dreamRole, setDreamRole] = React.useState("Full Stack Developer")
  const [dreamCtc, setDreamCtc] = React.useState("12")
  const [dreamSkillsInput, setDreamSkillsInput] = React.useState("React, TypeScript, System Design, Node.js")
  const [currentSkillsInput, setCurrentSkillsInput] = React.useState("JavaScript, React, Git, HTML/CSS")
  const [skillLevel, setSkillLevel] = React.useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate")
  const [targetJobType, setTargetJobType] = React.useState("Full-time")
  const [preferredWorkMode, setPreferredWorkMode] = React.useState("Hybrid")
  const [targetTimeline, setTargetTimeline] = React.useState("3 months")
  const [targetCompaniesInput, setTargetCompaniesInput] = React.useState("Google, Microsoft, Amazon, Atlassian")
  const [currentChallenges, setCurrentChallenges] = React.useState("System design concepts and advanced SQL optimization")

  const totalSteps = 4
  const progressPercent = (step / totalSteps) * 100

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      if (!dreamJob.trim() || !dreamRole.trim()) {
        setError("Please enter your dream job domain and target role.")
        return
      }
    }
    if (step < totalSteps) setStep(step + 1)
  }

  const handlePrev = () => {
    setError(null)
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    // Pre-submission validation
    if (!dreamJob.trim() || !dreamRole.trim()) {
      setError("Please specify both your dream job domain and target role.")
      setLoading(false)
      return
    }

    const dreamSkills = dreamSkillsInput.split(",").map((s) => s.trim()).filter(Boolean)
    const currentSkills = currentSkillsInput.split(",").map((s) => s.trim()).filter(Boolean)
    const targetCompanies = targetCompaniesInput.split(",").map((s) => s.trim()).filter(Boolean)

    if (currentSkills.length === 0) {
      setError("Please specify at least one current skill.")
      setLoading(false)
      return
    }

    if (!targetTimeline) {
      setError("Please select your target readiness timeline.")
      setLoading(false)
      return
    }

    try {
      const payload = {
        dream_job: dreamJob.trim(),
        dream_role: dreamRole.trim(),
        dream_ctc: dreamCtc ? parseFloat(dreamCtc) : null,
        dream_skills: dreamSkills,
        current_skills: currentSkills,
        skill_level: skillLevel,
        target_job_type: targetJobType,
        preferred_work_mode: preferredWorkMode,
        target_timeline: targetTimeline,
        target_companies: targetCompanies,
        current_challenges: currentChallenges,
      }

      const res = await fetch("/api/students/career-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.profile) {
        onOpenChange(false)
        if (onCompleted) {
          onCompleted()
        }
        router.push("/student/roadmap")
      } else {
        setError(data.error || "Failed to save career profile. Please verify your details.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected network error occurred while saving your profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            <IconSparkles className="h-3.5 w-3.5 text-amber-500" />
            AI Career Intelligence Onboarding
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Design Your Target Career Trajectory
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Help us personalize your AI Interview practice and generate real portal-grounded job recommendations.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center gap-2">
            <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="my-2 space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-zinc-500">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progressPercent)}% Completed</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Form Steps */}
        <div className="py-3">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">What is your dream job domain?</Label>
                <Input
                  value={dreamJob}
                  onChange={(e) => setDreamJob(e.target.value)}
                  placeholder="e.g. Software Engineer, AI Research, Data Scientist"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">What specific target role do you want?</Label>
                <Input
                  value={dreamRole}
                  onChange={(e) => setDreamRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer, Frontend Engineer, DevOps Engineer"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target CTC (LPA in ₹)</Label>
                <Input
                  type="number"
                  value={dreamCtc}
                  onChange={(e) => setDreamCtc(e.target.value)}
                  placeholder="e.g. 12"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Which skills do you currently possess?</Label>
                <Input
                  value={currentSkillsInput}
                  onChange={(e) => setCurrentSkillsInput(e.target.value)}
                  placeholder="Comma separated: React, JavaScript, SQL, Python"
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-zinc-400">Separate multiple skills with commas.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Which dream skills do you want to master next?</Label>
                <Input
                  value={dreamSkillsInput}
                  onChange={(e) => setDreamSkillsInput(e.target.value)}
                  placeholder="Comma separated: System Design, Docker, Kubernetes, Next.js"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">How would you describe your overall current level?</Label>
                <Select value={skillLevel} onValueChange={(v) => v && setSkillLevel(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner (Building core foundations)</SelectItem>
                    <SelectItem value="Intermediate">Intermediate (Comfortable with projects)</SelectItem>
                    <SelectItem value="Advanced">Advanced (Production-ready engineer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Target Job Type</Label>
                  <Select value={targetJobType} onValueChange={(v) => v && setTargetJobType(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Both">Both Internship & Full-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Work Mode Preference</Label>
                  <Select value={preferredWorkMode} onValueChange={(v) => v && setPreferredWorkMode(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Onsite">On-site</SelectItem>
                      <SelectItem value="Any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">When do you want to be fully job-ready?</Label>
                <Select value={targetTimeline} onValueChange={(v) => v && setTargetTimeline(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 month">1 Month (Urgent placement)</SelectItem>
                    <SelectItem value="3 months">3 Months</SelectItem>
                    <SelectItem value="6 months">6 Months</SelectItem>
                    <SelectItem value="1 year">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dream Target Companies (Optional)</Label>
                <Input
                  value={targetCompaniesInput}
                  onChange={(e) => setTargetCompaniesInput(e.target.value)}
                  placeholder="Comma separated: Google, Microsoft, Amazon, Stripe"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">What are you currently struggling with most?</Label>
                <Textarea
                  value={currentChallenges}
                  onChange={(e) => setCurrentChallenges(e.target.value)}
                  placeholder="e.g. System design rounds, database query optimization, coding interview timing..."
                  className="h-20 text-xs resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={step === 1 || loading}
            className="h-8 text-xs gap-1"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Previous
          </Button>

          {step < totalSteps ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={loading}
              className="h-8 text-xs gap-1"
            >
              Next Step
              <IconArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="h-8 text-xs gap-1.5 bg-primary"
            >
              <IconCheck className="h-3.5 w-3.5" />
              {loading ? "Saving Career Goals..." : "Complete & Generate Roadmap"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
