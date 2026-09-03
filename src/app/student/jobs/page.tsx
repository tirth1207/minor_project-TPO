"use client"

import * as React from "react"
import Link from "next/link"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBookmark,
  IconCheck,
  IconLock,
  IconMapPin,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatLpa(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  const lpa = value >= 100000 ? value / 100000 : value
  return Number.isInteger(lpa)
    ? lpa.toString()
    : lpa.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function getWebsiteIconUrl(website: string | null | undefined) {
  if (!website) return null

  try {
    const normalizedWebsite = website.startsWith("http") ? website : `https://${website}`
    const hostname = new URL(normalizedWebsite).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
  } catch {
    return null
  }
}

function CompanyWebsiteIcon({ companyName, website }: { companyName: string; website: string | null }) {
  const [iconFailed, setIconFailed] = React.useState(false)
  const iconUrl = getWebsiteIconUrl(website)

  if (!iconUrl || iconFailed) {
    return <span>{companyName.charAt(0).toUpperCase() || "C"}</span>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl}
      alt=""
      className="size-6 rounded-md object-contain"
      onError={() => setIconFailed(true)}
    />
  )
}

const BOOKMARKS_STORAGE_KEY = "tpo-student-bookmarked-jobs"

export default function StudentJobsPage() {
  const { profile, jobs, applications, mockInterviews, handleApplyJob } = useStudent()
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)
  const [bookmarkedJobs, setBookmarkedJobs] = React.useState<Set<string>>(new Set())
  const isApproved = profile?.profile_status === "APPROVED"

  React.useEffect(() => {
    try {
      const storedBookmarks = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)
      if (!storedBookmarks) return

      const parsedBookmarks: unknown = JSON.parse(storedBookmarks)
      if (Array.isArray(parsedBookmarks)) {
        setBookmarkedJobs(new Set(parsedBookmarks.filter((id): id is string => typeof id === "string")))
      }
    } catch {
      window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY)
    }
  }, [])

  const toggleBookmark = (jobId: string) => {
    setBookmarkedJobs((currentBookmarks) => {
      const nextBookmarks = new Set(currentBookmarks)
      if (nextBookmarks.has(jobId)) {
        nextBookmarks.delete(jobId)
      } else {
        nextBookmarks.add(jobId)
      }

      window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([...nextBookmarks]))
      return nextBookmarks
    })
  }

  return (
    <div className="w-full space-y-5">
      <StudentCareerOnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Campus opportunities</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Placement Drives</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Review every active drive, see exactly where you stand, and apply with confidence.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOnboardingOpen(true)} className="h-9 gap-1.5 self-start text-xs sm:self-auto">
          <IconSparkles className="h-3.5 w-3.5 text-amber-500" />
          Update Career Goals
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
          <p className="text-sm text-zinc-500">No active job postings are available in your college portal.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map(({ job, mapping, applicant_count, is_eligible, eligibility_reasons }) => {
            const alreadyApplied = mapping
              ? applications.some((application) => application.job_college_mapping?.id === mapping.id)
              : false
            const isEligible = is_eligible !== false
            const requireMock = Boolean(job.require_mock)
            const mockPassScore = job.mock_pass_score || 70
            const attempts = mockInterviews.filter(
              (mock) => mock.job_college_mapping_id === mapping?.id && mock.mock_type === "JOB_REQUIRED" && mock.status === "EVALUATED"
            )
            const bestAttempt = [...attempts].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))[0]
            const bestScore = bestAttempt?.overall_score ?? bestAttempt?.ai_score ?? null
            const hasPassedMock = Boolean(bestScore !== null && bestScore >= mockPassScore && bestAttempt?.passed !== false)
            const isBookmarked = bookmarkedJobs.has(job.id)
            const failedCriteria = eligibility_reasons
              ? [
                  !eligibility_reasons.branch && "Branch",
                  !eligibility_reasons.cgpa && "CGPA",
                  !eligibility_reasons.backlogs && "Backlogs",
                ].filter(Boolean)
              : []

            return (
              <Card key={job.id} className="flex h-full flex-col overflow-hidden rounded-xl border-zinc-200 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800">
                <CardHeader className="space-y-3 p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <CompanyWebsiteIcon
                          companyName={job.company?.company_name || "Corporate Partner"}
                          website={job.company?.website || null}
                        />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{job.title}</CardTitle>
                        <p className="mt-1 truncate text-xs text-zinc-500">{job.company?.company_name || "Corporate Partner"}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleBookmark(job.id)}
                      className={`size-8 shrink-0 rounded-lg hover:text-primary ${isBookmarked ? "text-primary" : "text-zinc-400"}`}
                      title={isBookmarked ? "Remove saved job" : "Save job"}
                      aria-label={isBookmarked ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
                      aria-pressed={isBookmarked}
                    >
                      <IconBookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><IconMapPin className="h-3.5 w-3.5" />{job.location || "Location not specified"}</span>
                    <Badge variant="secondary" className="text-[10px]">{job.work_mode || "Flexible"}</Badge>
                    <Badge variant="secondary" className="text-[10px]">Full-time</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 px-5 pb-4 pt-1">
                  <p className="line-clamp-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{job.description || "Explore this campus recruitment opportunity."}</p>

                  <div className={`rounded-lg border px-3 py-2 ${isEligible ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {isEligible ? <IconCheck className="h-3.5 w-3.5 text-emerald-600" /> : <IconAlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                      <span>{isEligible ? "Eligible for this drive" : "Eligibility criteria not met"}</span>
                    </div>
                    {!isEligible && failedCriteria.length > 0 && <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">Review: {failedCriteria.join(", ")}</p>}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-500">AI assessment</span>
                    {!requireMock ? <span className="text-zinc-400">Not required</span> : hasPassedMock ? <Badge className="bg-emerald-600 text-[10px]">Passed {bestScore}%</Badge> : <span className="text-amber-600">Required: {mockPassScore}%</span>}
                  </div>
                </CardContent>

                <CardFooter className="flex items-end justify-between gap-3 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">₹{formatLpa(job.ctc_max)} <span className="text-[11px] font-normal text-zinc-400">LPA</span></p>
                    <p className="inline-flex items-center gap-1 text-[11px] text-zinc-400"><IconUsers className="h-3 w-3" />{applicant_count} applicants</p>
                    {requireMock && !hasPassedMock && mapping && <Link href={`/student/mock/job/${mapping.id}`} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">{bestScore !== null ? "Retake assessment" : "Take assessment"}<IconArrowRight className="h-3 w-3" /></Link>}
                  </div>

                  {alreadyApplied ? (
                    <Badge variant="outline" className="gap-1 border-emerald-300 px-2.5 py-1 text-emerald-700"><IconCheck className="h-3.5 w-3.5" />Applied</Badge>
                  ) : requireMock && !hasPassedMock ? (
                    <Button size="sm" variant="outline" disabled className="gap-1 text-xs"><IconLock className="h-3.5 w-3.5" />Assessment first</Button>
                  ) : (
                    <Button size="sm" onClick={() => handleApplyJob(mapping?.id ?? null, isEligible, eligibility_reasons)} disabled={!isApproved || !mapping} className="text-xs">
                      {!mapping ? "Pending" : !isApproved ? "Profile Pending" : isEligible ? "Apply Now" : "Apply Anyway"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
