"use client"

import * as React from "react"
import Link from "next/link"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBookmark,
  IconBriefcase,
  IconCheck,
  IconLock,
  IconMapPin,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"

function formatLpa(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—"
  }

  const lpa = value >= 100000 ? value / 100000 : value

  return Number.isInteger(lpa)
    ? lpa.toString()
    : lpa.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function getWebsiteIconUrl(website: string | null | undefined) {
  if (!website) {
    return null
  }

  try {
    const normalizedWebsite = website.startsWith("http")
      ? website
      : `https://${website}`

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      new URL(normalizedWebsite).hostname
    )}&sz=64`
  } catch {
    return null
  }
}

function CompanyWebsiteIcon({
  companyName,
  website,
}: {
  companyName: string
  website: string | null
}) {
  const [failed, setFailed] = React.useState(false)
  const iconUrl = getWebsiteIconUrl(website)

  if (!iconUrl || failed) {
    return <span>{companyName.charAt(0).toUpperCase() || "C"}</span>
  }

  return (
    <img
      src={iconUrl}
      alt=""
      className="size-6 rounded-md object-contain"
      onError={() => setFailed(true)}
    />
  )
}

const BOOKMARKS_STORAGE_KEY = "tpo-student-bookmarked-jobs"

type Filter = "all" | "eligible" | "saved"

export default function StudentJobsPage() {
  const {
    profile,
    jobs,
    applications,
    mockInterviews,
    handleApplyJob,
  } = useStudent()
  const [onboardingOpen, setOnboardingOpen] = React.useState(false)
  const [bookmarkedJobs, setBookmarkedJobs] = React.useState<Set<string>>(
    new Set()
  )
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const isApproved = profile?.profile_status === "APPROVED"

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)

      if (stored) {
        const parsed: unknown = JSON.parse(stored)

        if (Array.isArray(parsed)) {
          setBookmarkedJobs(
            new Set(
              parsed.filter(
                (id): id is string => typeof id === "string"
              )
            )
          )
        }
      }
    } catch {
      window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY)
    }
  }, [])

  const toggleBookmark = (jobId: string) => {
    setBookmarkedJobs((current) => {
      const next = new Set(current)

      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }

      window.localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify([...next])
      )

      return next
    })
  }

  const visibleJobs = jobs.filter(({ job, is_eligible }) => {
    const query = search.trim().toLowerCase()
    const matchesSearch =
      !query ||
      [
        job.title,
        job.description,
        job.location,
        job.work_mode,
        job.company?.company_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)

    const matchesFilter =
      filter === "all" ||
      (filter === "eligible" && is_eligible !== false) ||
      (filter === "saved" && bookmarkedJobs.has(job.id))

    return matchesSearch && matchesFilter
  })

  return (
    <div className="portal-page space-y-6 pb-8">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />

      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge
            variant="secondary"
            className="mb-2 gap-1.5 rounded-full text-[10px]"
          >
            <IconBriefcase className="size-3.5 text-primary" />
            Campus opportunities
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            Placement drives
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            See the drives you can act on right now, with eligibility and
            assessment requirements explained before you apply.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setOnboardingOpen(true)}
          className="gap-1.5 self-start"
        >
          <IconSparkles className="size-3.5 text-primary" />
          Update career goals
        </Button>
      </section>

      <section className="portal-surface rounded-xl p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles, companies, locations..."
              className="h-10 border-0 bg-muted/60 pl-9 pr-9 shadow-none focus-visible:ring-1"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-4" />
              </button>
            )}
          </div>

          <div className="flex rounded-lg bg-muted p-1">
            {(["all", "eligible", "saved"] as Filter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={filter === value}
              >
                {value === "all"
                  ? `All ${jobs.length}`
                  : value === "eligible"
                    ? `Eligible ${jobs.filter((job) => job.is_eligible !== false).length}`
                    : `Saved ${bookmarkedJobs.size}`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!isApproved && jobs.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="text-xs leading-5">
            <span className="font-semibold">
              Your profile is awaiting approval.
            </span>{" "}
            You can explore drives now, but applications will unlock once your
            TPO/mentor approves your profile.
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="portal-muted-panel flex flex-col items-center justify-center p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <IconBriefcase className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium">No active drives yet</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            New campus opportunities will appear here once they are published
            by your TPO.
          </p>
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="portal-muted-panel flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-medium">No drives match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try another search or switch back to all opportunities.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearch("")
              setFilter("all")
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleJobs.map(
            ({
              job,
              mapping,
              applicant_count,
              is_eligible,
              eligibility_reasons,
              missing_skills,
              failed_requirements,
            }) => {
              const alreadyApplied = mapping
                ? applications.some(
                    (application) =>
                      application.job_college_mapping?.id === mapping.id
                  )
                : false
              const isEligible = is_eligible !== false
              const requireMock = Boolean(job.require_mock)
              const mockPassScore = job.mock_pass_score || 70
              const attempts = mockInterviews.filter(
                (mock) =>
                  mock.job_college_mapping_id === mapping?.id &&
                  mock.mock_type === "JOB_REQUIRED" &&
                  mock.status === "EVALUATED"
              )
              const bestAttempt = [...attempts].sort(
                (a, b) =>
                  (b.overall_score || 0) - (a.overall_score || 0)
              )[0]
              const bestScore =
                bestAttempt?.overall_score ?? bestAttempt?.ai_score ?? null
              const hasPassedMock = Boolean(
                bestScore !== null &&
                  bestScore >= mockPassScore &&
                  bestAttempt?.passed !== false
              )
              const isBookmarked = bookmarkedJobs.has(job.id)

              return (
                <Card
                  key={job.id}
                  className="portal-interactive flex h-full flex-col overflow-hidden rounded-xl border-border/70"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
                          <CompanyWebsiteIcon
                            companyName={
                              job.company?.company_name || "Corporate Partner"
                            }
                            website={job.company?.website || null}
                          />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">
                            {job.title}
                          </CardTitle>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {job.company?.company_name || "Corporate Partner"}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBookmark(job.id)}
                        className={`size-8 shrink-0 rounded-lg ${
                          isBookmarked
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                        aria-label={
                          isBookmarked
                            ? `Remove ${job.title} from saved jobs`
                            : `Save ${job.title}`
                        }
                        aria-pressed={isBookmarked}
                        title={
                          isBookmarked ? "Remove saved job" : "Save job"
                        }
                      >
                        <IconBookmark
                          className={`size-4 ${
                            isBookmarked ? "fill-current" : ""
                          }`}
                        />
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                        <IconMapPin className="size-3.5" />
                        {job.location || "Location flexible"}
                      </span>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[10px]"
                      >
                        {job.work_mode || "Flexible"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-[10px]"
                      >
                        Full-time
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4 px-5 pb-4 pt-1">
                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {job.description ||
                        "Explore this campus recruitment opportunity."}
                    </p>

                    <div
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isEligible
                          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                          : "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {isEligible ? (
                          <IconCheck className="size-4 text-emerald-600" />
                        ) : (
                          <IconAlertTriangle className="size-4 text-amber-600" />
                        )}
                        <span>
                          {isEligible
                            ? "Eligible for this drive"
                            : "Not eligible for this drive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          {eligibility_reasons?.profileApproved !== false ? (
                            <IconCheck className="size-3 text-emerald-600 shrink-0" />
                          ) : (
                            <IconX className="size-3 text-rose-600 shrink-0" />
                          )}
                          <span className={eligibility_reasons?.profileApproved !== false ? "text-foreground" : "text-rose-700 dark:text-rose-400 font-medium"}>
                            Profile approved
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {eligibility_reasons?.branch !== false ? (
                            <IconCheck className="size-3 text-emerald-600 shrink-0" />
                          ) : (
                            <IconX className="size-3 text-rose-600 shrink-0" />
                          )}
                          <span className={eligibility_reasons?.branch !== false ? "text-foreground" : "text-rose-700 dark:text-rose-400 font-medium"}>
                            Branch eligible
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {eligibility_reasons?.cgpa !== false ? (
                            <IconCheck className="size-3 text-emerald-600 shrink-0" />
                          ) : (
                            <IconX className="size-3 text-rose-600 shrink-0" />
                          )}
                          <span className={eligibility_reasons?.cgpa !== false ? "text-foreground" : "text-rose-700 dark:text-rose-400 font-medium"}>
                            CGPA (≥{job.min_cgpa})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {eligibility_reasons?.backlogs !== false ? (
                            <IconCheck className="size-3 text-emerald-600 shrink-0" />
                          ) : (
                            <IconX className="size-3 text-rose-600 shrink-0" />
                          )}
                          <span className={eligibility_reasons?.backlogs !== false ? "text-foreground" : "text-rose-700 dark:text-rose-400 font-medium"}>
                            Backlogs (≤{job.max_backlogs})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 col-span-2">
                          {eligibility_reasons?.skills !== false ? (
                            <IconCheck className="size-3 text-emerald-600 shrink-0" />
                          ) : (
                            <IconX className="size-3 text-rose-600 shrink-0" />
                          )}
                          <span className={eligibility_reasons?.skills !== false ? "text-foreground" : "text-rose-700 dark:text-rose-400 font-medium"}>
                            {eligibility_reasons?.skills !== false
                              ? "Required skills satisfied"
                              : `Missing skills: ${missing_skills?.join(", ") || "Skills missing"}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs">
                      <div>
                        <span className="font-semibold text-foreground">
                          ₹{formatLpa(job.ctc_max)} LPA
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          · {applicant_count} applicants
                        </span>
                      </div>

                      {requireMock ? (
                        <Badge
                          variant={hasPassedMock ? "outline" : "secondary"}
                          className={
                            hasPassedMock
                              ? "text-emerald-600"
                              : "text-amber-700 dark:text-amber-300"
                          }
                        >
                          {hasPassedMock
                            ? `Mock passed · ${bestScore}%`
                            : `Mock required · ${mockPassScore}%`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          No assessment gate
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
                    <Link
                      href={`/student/jobs/${mapping?.id || job.id}`}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      View details
                    </Link>

                    {alreadyApplied ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 px-2.5 py-1 text-emerald-700"
                      >
                        <IconCheck className="size-3.5" />
                        Applied
                      </Badge>
                    ) : requireMock && !hasPassedMock ? (
                      mapping ? (
                        <Link href={`/student/mock/job/${mapping.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                          >
                            <IconLock className="size-3.5" />
                            {bestScore !== null ? "Retake mock" : "Take mock"}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="text-xs"
                        >
                          Assessment pending
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleApplyJob(
                            mapping?.id ?? null,
                            isEligible,
                            failed_requirements
                          )
                        }
                        disabled={!isApproved || !mapping || !isEligible}
                        className="gap-1.5 text-xs"
                      >
                        {!mapping
                          ? "Pending"
                          : !isApproved
                            ? "Profile pending"
                            : !isEligible
                              ? "Not eligible"
                              : "Apply now"}
                        {isEligible && isApproved && mapping && (
                          <IconArrowRight className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}
