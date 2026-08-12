"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react"

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
    handleApplyJob,
  } = useStudent()

  const isApproved = profile?.profile_status === "APPROVED"

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Campus Placements
        </h1>

        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Explore approved placement opportunities and apply to eligible drives.
        </p>
      </div>

      {/* Table */}
      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            No active job postings available.
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
                    Criteria
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
                      (app) =>
                        app.job_college_mapping?.id === mapping.id
                    )
                    : false

                  const isEligible = is_eligible !== false

                  const reasons = eligibility_reasons || {
                    branch: true,
                    cgpa: true,
                    backlogs: true,
                  }

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

                            {job.require_mock && (
                              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                                Mock
                              </span>
                            )}
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
                          <div className="group relative inline-flex">
                            <Badge
                              variant="outline"
                              className="h-5 gap-1 rounded-md border-rose-200 bg-rose-50 px-1.5 text-[10px] font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                              Ineligible
                            </Badge>

                            <div className="pointer-events-none absolute left-0 top-7 z-50 hidden w-56 rounded-md border border-zinc-200 bg-white p-2.5 text-[10px] shadow-lg group-hover:block dark:border-zinc-800 dark:bg-zinc-950">
                              <div className="mb-1.5 flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                <IconAlertTriangle className="h-3 w-3 text-amber-500" />
                                Unmatched criteria
                              </div>

                              <div className="space-y-1 text-zinc-500">
                                {!reasons.branch && (
                                  <p>
                                    Branch &quot;{profile?.branch}&quot; is not eligible.
                                  </p>
                                )}

                                {!reasons.cgpa && (
                                  <p>
                                    CGPA {profile?.cgpa} is below {job.min_cgpa}.
                                  </p>
                                )}

                                {!reasons.backlogs && (
                                  <p>
                                    {profile?.active_backlogs} backlogs; maximum is{" "}
                                    {job.max_backlogs}.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Criteria */}
                      <TableCell className="px-3 py-2">
                        <div className="whitespace-nowrap text-[10px] text-zinc-500">
                          <span>
                            {job.branches?.length
                              ? job.branches
                                .map((b) => b.branch_name)
                                .join(", ")
                              : "All Branches"}
                          </span>

                          <span className="mx-1 text-zinc-300 dark:text-zinc-700">
                            •
                          </span>

                          <span>CGPA ≥ {job.min_cgpa}</span>

                          <span className="mx-1 text-zinc-300 dark:text-zinc-700">
                            •
                          </span>

                          <span>Backlogs ≤ {job.max_backlogs}</span>
                        </div>
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
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleApplyJob(mapping?.id ?? null)
                            }
                            disabled={
                              !isApproved ||
                              !mapping ||
                              !isEligible
                            }
                            className="h-7 rounded-md px-2.5 text-[11px]"
                          >
                            {!mapping
                              ? "Pending"
                              : !isApproved
                                ? "Profile Pending"
                                : !isEligible
                                  ? "Ineligible"
                                  : "Apply"}
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