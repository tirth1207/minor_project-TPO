"use client"

import * as React from "react"
import Link from "next/link"
import { useStudent } from "../student-context"
import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog"
import { IconAlertTriangle, IconCheck, IconSparkles, IconArrowRight, IconLock } from "@tabler/icons-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function StudentJobsPage() {
  const {
    profile,
    jobs,
    applications,
    mockInterviews,
    handleApplyJob,
  } = useStudent()

  const [onboardingOpen, setOnboardingOpen] = React.useState(false)

  const isApproved = profile?.profile_status === "APPROVED"

  return (
    <div className="w-full space-y-5">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Campus Placement Drives
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Explore active recruitment postings and complete mandatory AI assessments to unlock job applications.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setOnboardingOpen(true)}
          className="h-8 text-xs gap-1.5 self-start sm:self-auto"
        >
          <IconSparkles className="h-3.5 w-3.5 text-amber-500" />
          Update Career Goals
        </Button>
      </div>

      {/* Table */}
      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            No active job postings available in your college portal.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="h-9 bg-zinc-50/70 hover:bg-zinc-50/70 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/40">
                  <TableHead className="h-9 px-3 font-medium">
                    Company / Role
                  </TableHead>

                  <TableHead className="h-9 px-3 whitespace-nowrap">
                    Package
                  </TableHead>

                  <TableHead className="h-9 px-3 whitespace-nowrap">
                    Location
                  </TableHead>

                  <TableHead className="h-9 px-3">
                    Eligibility
                  </TableHead>

                  <TableHead className="h-9 px-3">
                    AI Assessment Gate
                  </TableHead>

                  <TableHead className="h-9 px-3 text-center">
                    Applicants
                  </TableHead>

                  <TableHead className="h-9 px-3 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {jobs.map((jobItem) => {
                  const {
                    job,
                    mapping,
                    applicant_count,
                    is_eligible,
                    eligibility_reasons,
                  } = jobItem

                  const alreadyApplied = mapping
                    ? applications.some(
                      (app) => app.job_college_mapping?.id === mapping.id
                    )
                    : false

                  const isEligible = is_eligible !== false
                  const requireMock = Boolean(job.require_mock)
                  const mockPassScore = job.mock_pass_score || 70

                  // Find best JOB_REQUIRED mock attempt for this exact mapping
                  const attempts = mockInterviews.filter(
                    (m) =>
                      m.job_college_mapping_id === mapping?.id &&
                      m.mock_type === "JOB_REQUIRED" &&
                      m.status === "EVALUATED"
                  )
                  const bestAttempt = attempts.sort(
                    (a, b) => (b.overall_score || 0) - (a.overall_score || 0)
                  )[0]

                  const bestScore = bestAttempt?.overall_score ?? bestAttempt?.ai_score ?? null
                  const hasPassedMock = Boolean(
                    bestScore !== null && bestScore >= mockPassScore && bestAttempt?.passed !== false
                  )

                  return (
                    <TableRow
                      key={job.id}
                      className="h-14 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
                    >
                      {/* Company / Role */}
                      <TableCell className="px-3 py-2">
                        <div className="min-w-45">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {job.title}
                            </span>
                          </div>

                          <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                            {job.company?.company_name || "Corporate Partner"}
                          </p>
                        </div>
                      </TableCell>

                      {/* Package */}
                      <TableCell className="px-3 py-2">
                        <span className="font-semibold text-primary">
                          ₹{job.ctc_max} LPA
                        </span>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="px-3 py-2">
                        <div className="whitespace-nowrap">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {job.location || "—"}
                          </span>
                          <span className="ml-1.5 text-[10px] text-zinc-400">
                            {job.work_mode || ""}
                          </span>
                        </div>
                      </TableCell>

                      {/* Eligibility */}
                      <TableCell className="px-3 py-2">
                        {isEligible ? (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 rounded-md border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Eligible
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="h-5 gap-1 rounded-md border-rose-200 bg-rose-50 px-1.5 text-[10px] font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                          >
                            Ineligible
                          </Badge>
                        )}
                      </TableCell>

                      {/* AI Assessment Gate */}
                      <TableCell className="px-3 py-2">
                        {!requireMock ? (
                          <span className="text-[11px] text-zinc-400">Not Required</span>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px]">
                              {hasPassedMock ? (
                                <Badge variant="outline" className="h-5 text-[9px] border-emerald-300 bg-emerald-50 text-emerald-700">
                                  Passed ({bestScore}%)
                                </Badge>
                              ) : bestScore !== null ? (
                                <Badge variant="outline" className="h-5 text-[9px] border-rose-300 bg-rose-50 text-rose-700">
                                  Score: {bestScore}% (Req: {mockPassScore}%)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="h-5 text-[9px] border-amber-300 bg-amber-50 text-amber-800">
                                  Required ({mockPassScore}%)
                                </Badge>
                              )}
                            </div>
                            {mapping && !hasPassedMock && (
                              <Link href={`/student/mock/job/${mapping.id}`} className="block text-[10px] text-primary hover:underline font-medium">
                                {bestScore !== null ? "Retake Job Assessment →" : "Take Required Assessment →"}
                              </Link>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Applicants */}
                      <TableCell className="px-3 py-2 text-center">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">
                          {applicant_count}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="px-3 py-2 text-right">
                        {alreadyApplied ? (
                          <Badge
                            variant="outline"
                            className="h-6 gap-1 rounded-md border-emerald-200 px-2 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400"
                          >
                            <IconCheck className="h-3 w-3" />
                            Applied
                          </Badge>
                        ) : requireMock && !hasPassedMock ? (
                          <Link href={`/student/mock/job/${mapping?.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-md px-2.5 text-[11px] border-amber-300 text-amber-800 dark:text-amber-300"
                            >
                              Take Job Mock
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApplyJob(mapping?.id ?? null)}
                            disabled={!isApproved || !mapping || !isEligible}
                            className="h-7 rounded-md px-2.5 text-[11px]"
                          >
                            {!mapping
                              ? "Pending"
                              : !isApproved
                                ? "Profile Pending"
                                : !isEligible
                                  ? "Ineligible"
                                  : "Apply Now"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
