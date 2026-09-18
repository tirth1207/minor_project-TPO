"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useStudent } from "../../student-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconLock,
  IconMapPin,
  IconX,
} from "@tabler/icons-react"

export default function StudentJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { jobs, profile, applications, mockInterviews, handleApplyJob } = useStudent()

  const targetJobEntry = jobs.find(
    (item) => item.mapping?.id === id || item.job.id === id
  )

  if (!targetJobEntry) {
    return (
      <div className="portal-page space-y-6 pb-8">
        <Button size="sm" variant="ghost" onClick={() => router.push("/student/jobs")}>
          <IconArrowLeft className="mr-2 size-4" />
          Back to Jobs
        </Button>
        <Card className="p-8 text-center">
          <p className="text-sm font-medium">Job opportunity not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This job drive may no longer be available or is pending college approval.
          </p>
        </Card>
      </div>
    )
  }

  const {
    job,
    mapping,
    is_eligible,
    eligibility_reasons,
    missing_skills,
    failed_requirements,
  } = targetJobEntry

  const isApproved = profile?.profile_status === "APPROVED"
  const alreadyApplied = mapping
    ? applications.some((app) => app.job_college_mapping?.id === mapping.id)
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
    (a, b) => (b.overall_score || 0) - (a.overall_score || 0)
  )[0]
  const bestScore = bestAttempt?.overall_score ?? bestAttempt?.ai_score ?? null
  const hasPassedMock = Boolean(
    bestScore !== null && bestScore >= mockPassScore && bestAttempt?.passed !== false
  )

  return (
    <div className="portal-page space-y-6 pb-8">
      <Link href="/student/jobs">
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
          <IconArrowLeft className="size-4" />
          Back to All Drives
        </Button>
      </Link>

      <Card className="rounded-2xl border-border/70 p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-foreground font-bold text-background">
                <IconBriefcase className="size-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{job.title}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {job.company?.company_name || "Corporate Partner"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <IconMapPin className="size-3.5" />
                {job.location || "Flexible"}
              </Badge>
              <Badge variant="outline">{job.work_mode || "Full-time"}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-0 pt-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Job Description
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {job.description || "No detailed description provided for this campus drive."}
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 space-y-3 ${
              isEligible
                ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {isEligible ? (
                <IconCheck className="size-4 text-emerald-600" />
              ) : (
                <IconAlertTriangle className="size-4 text-amber-600" />
              )}
              <span>
                {isEligible
                  ? "You meet all eligibility requirements"
                  : "Eligibility Criteria Breakdown"}
              </span>
            </div>

            <div className="grid gap-2 text-xs pt-2 border-t border-border/40 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                {eligibility_reasons?.profileApproved !== false ? (
                  <IconCheck className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <IconX className="size-3.5 text-rose-600 shrink-0" />
                )}
                <span>Profile Status: {profile?.profile_status || "PENDING"}</span>
              </div>

              <div className="flex items-center gap-2">
                {eligibility_reasons?.branch !== false ? (
                  <IconCheck className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <IconX className="size-3.5 text-rose-600 shrink-0" />
                )}
                <span>Eligible Branch ({profile?.branch || "N/A"})</span>
              </div>

              <div className="flex items-center gap-2">
                {eligibility_reasons?.cgpa !== false ? (
                  <IconCheck className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <IconX className="size-3.5 text-rose-600 shrink-0" />
                )}
                <span>CGPA: {profile?.cgpa ?? 0} (Required ≥ {job.min_cgpa})</span>
              </div>

              <div className="flex items-center gap-2">
                {eligibility_reasons?.backlogs !== false ? (
                  <IconCheck className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <IconX className="size-3.5 text-rose-600 shrink-0" />
                )}
                <span>Active Backlogs: {profile?.active_backlogs ?? 0} (Allowed ≤ {job.max_backlogs})</span>
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                {eligibility_reasons?.skills !== false ? (
                  <IconCheck className="size-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <IconX className="size-3.5 text-rose-600 shrink-0" />
                )}
                <span>
                  {eligibility_reasons?.skills !== false
                    ? "Required Skills Satisfied"
                    : `Missing Required Skills: ${missing_skills?.join(", ") || "Skills missing"}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Compensation Range</p>
              <p className="text-base font-bold text-foreground">
                {job.ctc_min && job.ctc_max
                  ? `₹${job.ctc_min}–${job.ctc_max} LPA`
                  : job.ctc_max
                  ? `₹${job.ctc_max} LPA`
                  : job.ctc_min
                  ? `₹${job.ctc_min}+ LPA`
                  : "As per industry standards"}
              </p>
            </div>

            <div>
              {alreadyApplied ? (
                <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                  <IconCheck className="mr-1 size-3.5" />
                  Applied
                </Badge>
              ) : requireMock && !hasPassedMock ? (
                mapping ? (
                  <Link href={`/student/mock/job/${mapping.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                      <IconLock className="size-3.5" />
                      Take Required Mock Assessment
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" variant="outline" disabled className="text-xs">
                    Assessment Pending
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    handleApplyJob(mapping?.id ?? null, isEligible, failed_requirements)
                  }
                  disabled={!isApproved || !mapping || !isEligible}
                  className="text-xs"
                >
                  {!mapping
                    ? "Pending"
                    : !isApproved
                    ? "Profile Pending"
                    : !isEligible
                    ? "Not Eligible"
                    : "Submit Application"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
