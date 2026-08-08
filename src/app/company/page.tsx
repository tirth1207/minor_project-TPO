"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "./company-context"

import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconFileText,
  IconPlus,
  IconSend,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFooter,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CompanyRootPage() {
  const router = useRouter()

  const {
    jobs,
    applicants,
    offers,
    allApplicants
  } = useCompany()

  // ---------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------

  const totalJobs = jobs.length
  // const selectableApplicants = applicants.filter(
  //   (applicant) => applicant.status === "APPLIED"
  // )
  const activeJobs = jobs.filter(
    (job) =>
      job.global_status === "APPROVED"
  ).length

  const pendingJobs = jobs.filter(
    (job) => job.global_status === "PENDING"
  ).length

  const totalApplicants = allApplicants.length

  const shortlistedApplicants = allApplicants.filter(
    (applicant) => applicant.status === "SHORTLISTED"
  ).length

  const offeredApplicants = allApplicants.filter(
    (applicant) =>
      applicant.status === "OFFERED" ||
      applicant.offer?.status === "EXTENDED"
  ).length

  const hiredApplicants = allApplicants.filter(
    (applicant) =>
      applicant.status === "OFFERED" &&
      applicant.offer?.status !== "EXTENDED"
  ).length

  const appliedApplicants = allApplicants.filter(
    (applicant) => applicant.status === "APPLIED"
  ).length

  const shortlistRate =
    totalApplicants > 0
      ? Math.round(
        (shortlistedApplicants / totalApplicants) * 100
      )
      : 0

  const offerRate =
    totalApplicants > 0
      ? Math.round(
        (offeredApplicants / totalApplicants) * 100
      )
      : 0

  // ---------------------------------------------------------
  // Job performance
  // ---------------------------------------------------------

  const jobPerformance = jobs
    .map((job) => {
      const jobApplicants = allApplicants.filter(
        (applicant) =>
          applicant.job_college_mapping?.job?.id === job.id
      )

      return {
        ...job,
        applicantCount: jobApplicants.length,
        shortlistedCount: jobApplicants.filter(
          (applicant) => applicant.status === "SHORTLISTED"
        ).length,
      }
    })
    .sort((a, b) => b.applicantCount - a.applicantCount)
    .slice(0, 5)

  // ---------------------------------------------------------
  // Recent candidates
  // ---------------------------------------------------------

  const recentApplicants = [...allApplicants]
    .sort((a, b) => {
      const aDate = new Date(
        a.applied_at ?? 0
      ).getTime()

      const bDate = new Date(
        b.applied_at ?? 0
      ).getTime()

      return bDate - aDate
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------- */}
      {/* Heading */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Company Overview
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Track your campus openings, candidates,
            shortlists, and offers.
          </p>
        </div>

        <Button
          onClick={() =>
            router.push("/company/post-job")
          }
        >
          <IconPlus className="size-4" />
          Post New Opening
        </Button>
      </div>

      {/* -------------------------------------------------- */}
      {/* KPI cards */}
      {/* -------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Openings */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>
                  Total Openings
                </CardDescription>

                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {totalJobs}
                </CardTitle>
              </div>

              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <IconBriefcase className="size-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconCircleCheck className="size-3.5 text-emerald-500" />

              <span>
                <span className="font-medium text-foreground">
                  {activeJobs}
                </span>{" "}
                active
              </span>

              <span>·</span>

              <span>
                <span className="font-medium text-foreground">
                  {pendingJobs}
                </span>{" "}
                pending
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Applicants */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>
                  Total Applicants
                </CardDescription>

                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {totalApplicants}
                </CardTitle>
              </div>

              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <IconUsers className="size-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconTrendingUp className="size-3.5 text-emerald-500" />

              <span>
                Across{" "}
                <span className="font-medium text-foreground">
                  {totalJobs}
                </span>{" "}
                {totalJobs === 1 ? "opening" : "openings"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Shortlisted */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>
                  Shortlisted
                </CardDescription>

                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {shortlistedApplicants}
                </CardTitle>
              </div>

              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <IconCheck className="size-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconCircleCheck className="size-3.5 text-emerald-500" />

              <span>
                <span className="font-medium text-foreground">
                  {shortlistRate}%
                </span>{" "}
                of total applicants
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Offers Extended */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardDescription>
                  Offers Extended
                </CardDescription>

                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {offeredApplicants}
                </CardTitle>
              </div>

              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                <IconSend className="size-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconTrendingUp className="size-3.5 text-emerald-500" />

              <span>
                <span className="font-medium text-foreground">
                  {offerRate}%
                </span>{" "}
                conversion rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------- */}
      {/* Pipeline + Job performance */}
      {/* -------------------------------------------------- */}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recruitment Pipeline */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Recruitment Pipeline
            </CardTitle>

            <CardDescription>
              Candidate distribution across hiring
              stages.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <PipelineItem
              label="Applied"
              value={appliedApplicants}
              total={totalApplicants}
            />

            <PipelineItem
              label="Shortlisted"
              value={shortlistedApplicants}
              total={totalApplicants}
            />

            <PipelineItem
              label="Offers"
              value={offeredApplicants}
              total={totalApplicants}
            />

            <PipelineItem
              label="Hired"
              value={hiredApplicants}
              total={totalApplicants}
            />

            <div className="grid grid-cols-3 gap-3 border-t pt-5">
              <PipelineMetric
                label="Shortlist rate"
                value={`${shortlistRate}%`}
              />

              <PipelineMetric
                label="Offer rate"
                value={`${offerRate}%`}
              />

              <PipelineMetric
                label="Hired"
                value={hiredApplicants.toString()}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job performance */}

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>
                  Opening Performance
                </CardTitle>

                <CardDescription>
                  Applicant activity across your top
                  openings.
                </CardDescription>
              </div>
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push("/company/jobs")
                  }
                >
                  View jobs
                  <IconArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {jobPerformance.length === 0 ? (
              <EmptyState
                icon={<IconBriefcase />}
                title="No openings yet"
                description="Post your first opening to start receiving candidates."
              />
            ) : (
              <div className="space-y-5">
                {jobPerformance.map((job) => {
                  const maximum =
                    Math.max(
                      ...jobPerformance.map(
                        (item) =>
                          item.applicantCount
                      ),
                      1
                    )

                  const percentage =
                    (job.applicantCount /
                      maximum) *
                    100

                  return (
                    <div
                      key={job.id}
                      className="space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {job.title}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {job.location}
                            {job.work_mode
                              ? ` · ${job.work_mode}`
                              : ""}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">
                            {job.applicantCount}
                          </p>

                          <p className="text-[11px] text-muted-foreground">
                            applicants
                          </p>
                        </div>
                      </div>

                      <Progress
                        value={percentage}
                        className="h-1.5"
                      />

                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          {job.shortlistedCount}{" "}
                          shortlisted
                        </span>

                        {job.global_status && (
                          <span>
                            {job.global_status}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* -------------------------------------------------- */}
      {/* Recent applicants */}
      {/* -------------------------------------------------- */}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>
                Recent Applicants
              </CardTitle>

              <CardDescription>
                Latest candidates across your campus
                openings.
              </CardDescription>
            </div>
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    "/company/applicants"
                  )
                }
              >
                View applicants
                <IconArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {recentApplicants.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                icon={<IconUsers />}
                title="No applicants yet"
                description="New applications will appear here when students start applying."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Candidate
                  </TableHead>

                  <TableHead>
                    CGPA
                  </TableHead>

                  <TableHead>
                    Mock Score
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead className="text-right">
                    Resume
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {recentApplicants.map(
                  (applicant) => {
                    const student =
                      applicant.student

                    if (!student) return null

                    return (
                      <TableRow
                        key={applicant.id}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                              {student.name
                                ?.split(" ")
                                .slice(0, 2)
                                .map(
                                  (
                                    part: string
                                  ) => part[0]
                                )
                                .join("")}
                            </div>

                            <div>
                              <p className="font-medium">
                                {student.name}
                              </p>

                              <p className="font-mono text-xs text-muted-foreground">
                                {
                                  student.enrollment_no
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {student.cgpa ?? "—"}
                        </TableCell>

                        <TableCell>
                          {applicant.mock_score !==
                            null
                            ? `${applicant.mock_score}/100`
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <ApplicantStatus
                            status={
                              applicant.status
                            }
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          {student.resume_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              render={
                                <a
                                  href={
                                    student.resume_url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              <IconFileText className="size-4" />
                              Resume
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  }
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------- */}
      {/* Quick actions */}
      {/* -------------------------------------------------- */}

      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction
          icon={<IconPlus />}
          title="Post an Opening"
          description="Create a new campus recruitment opportunity."
          onClick={() =>
            router.push("/company/post-job")
          }
        />

        <QuickAction
          icon={<IconUsers />}
          title="Review Applicants"
          description="Review applications and shortlist candidates."
          onClick={() =>
            router.push("/company/applicants")
          }
        />

        <QuickAction
          icon={<IconBriefcase />}
          title="Manage Openings"
          description="View status and manage your existing job postings."
          onClick={() =>
            router.push("/company/jobs")
          }
        />
      </div>
    </div>
  )
}

// =========================================================
// Pipeline item
// =========================================================

function PipelineItem({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {label}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {percentage}%
          </span>

          <span className="min-w-6 text-right text-sm font-semibold">
            {value}
          </span>
        </div>
      </div>

      <Progress
        value={percentage}
        className="h-2"
      />
    </div>
  )
}

// =========================================================
// Pipeline metric
// =========================================================

function PipelineMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-lg font-semibold">
        {value}
      </p>

      <p className="text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

// =========================================================
// Applicant status
// =========================================================

function ApplicantStatus({
  status,
}: {
  status: string
}) {
  if (status === "SHORTLISTED") {
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-400"
      >
        Shortlisted
      </Badge>
    )
  }

  if (status === "OFFERED") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
      >
        Offered
      </Badge>
    )
  }

  if (status === "REJECTED") {
    return (
      <Badge variant="destructive">
        Rejected
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {status}
    </Badge>
  )
}

// =========================================================
// Empty state
// =========================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactElement
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-55 flex-col items-center justify-center text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {React.cloneElement(
          icon as React.ReactElement<{
            className?: string
          }>,
          {
            className: "size-5",
          }
        )}
      </div>

      <p className="text-sm font-medium">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

// =========================================================
// Quick action
// =========================================================

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactElement
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {React.cloneElement(
          icon as React.ReactElement<{
            className?: string
          }>,
          {
            className: "size-5",
          }
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <IconArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}