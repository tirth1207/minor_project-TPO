"use client"

import * as React from "react"
import { useCompany } from "../company-context"

import {
  IconBan,
  IconBriefcase,
  IconCheck,
  IconCircleCheck,
  IconExternalLink,
  IconFileText,
  IconSend,
  IconUsers,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function CompanyApplicantsPage() {
  const {
    jobs,
    selectedJob,
    setSelectedJob,
    applicants,
    selectedApplicantIds,
    setSelectedApplicantIds,
    extendCtcValues,
    setExtendCtcValues,
    handleShortlistApplicant,
    handleBulkShortlist,
    handleExtendOffer,
    handleRevokeOffer,
  } = useCompany()

  // const selectedJob = jobs.find((job) => job.id === selectedJob?.id)

  const selectableApplicants = applicants.filter(
    (applicant) => applicant.status === "APPLIED"
  )

  const selectedCount = selectableApplicants.filter(
    (applicant) => selectedApplicantIds[applicant.id]
  ).length

  const allSelected =
    selectableApplicants.length > 0 &&
    selectableApplicants.every(
      (applicant) => selectedApplicantIds[applicant.id]
    )

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}

    if (checked) {
      selectableApplicants.forEach((applicant) => {
        updated[applicant.id] = true
      })
    }

    setSelectedApplicantIds(updated)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPLIED":
        return (
          <Badge variant="outline">
            Applied
          </Badge>
        )

      case "SHORTLISTED":
        return (
          <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
            Shortlisted
          </Badge>
        )

      case "OFFERED":
        return (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            Offered
          </Badge>
        )

      case "REJECTED":
        return (
          <Badge variant="destructive">
            Rejected
          </Badge>
        )

      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  const getPostBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            Approved
          </Badge>
        )

      case "PENDING":
        return (
          <Badge className="border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-400">
            Pending
          </Badge>
        )

      case "REJECTED":
        return (
          <Badge variant="destructive">
            Rejected
          </Badge>
        )

      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IconUsers className="size-5 text-muted-foreground" />

            <h1 className="text-xl font-semibold tracking-tight">
              Applicants
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Review candidates, shortlist applications, and manage offers.
          </p>
        </div>

        {/* Opening selector */}

        <div className="w-full lg:w-[320px]">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Job opening
          </p>

          <Select
            value={selectedJob?.title || undefined}
            onValueChange={(value) => {
              const job = jobs.find((j) => j.title === value)
              setSelectedJob(job || null)
              setSelectedApplicantIds({})
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an opening" />
            </SelectTrigger>

            <SelectContent>
              {jobs.map((job) => (
                <SelectItem
                  key={job.id}
                  value={job.title}
                >
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected opening */}

      {selectedJob && (
        <div className="flex flex-col gap-4 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <IconBriefcase className="size-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {selectedJob.title}
                </p>

                {getPostBadge(selectedJob.global_status)}
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedJob.location}
                {selectedJob.work_mode && (
                  <> · {selectedJob.work_mode}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">
                {applicants.length}
              </span>{" "}
              applicants
            </div>

            <div>
              <span className="font-semibold text-foreground">
                {
                  applicants.filter(
                    (applicant) =>
                      applicant.status === "SHORTLISTED"
                  ).length
                }
              </span>{" "}
              shortlisted
            </div>
          </div>
        </div>
      )}

      {/* Applicants table */}

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex min-h-16 flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Candidate Roster
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedJob
                ? `${applicants.length} candidates applied for this opening`
                : "Select a job opening to view applicants"}
            </p>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedCount} selected
              </span>

              <Button
                size="sm"
                onClick={handleBulkShortlist}
              >
                <IconCircleCheck className="size-4" />
                Shortlist selected
              </Button>
            </div>
          )}
        </div>

        {!selectedJob ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/40">
              <IconBriefcase className="size-5 text-muted-foreground" />
            </div>

            <p className="text-sm font-medium">
              Select a job opening
            </p>

            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Choose an opening above to review its candidates and manage
              their applications.
            </p>
          </div>
        ) : applicants.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/40">
              <IconUsers className="size-5 text-muted-foreground" />
            </div>

            <p className="text-sm font-medium">
              No applicants yet
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Applications for this opening will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        handleSelectAll(checked === true)
                      }
                      aria-label="Select all applicants"
                    />
                  </TableHead>

                  <TableHead className="min-w-[220px]">
                    Candidate
                  </TableHead>

                  <TableHead>
                    CGPA
                  </TableHead>

                  <TableHead>
                    Backlogs
                  </TableHead>

                  <TableHead>
                    Mock Score
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead className="min-w-[230px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {applicants.map((applicant) => {
                  const student = applicant.student

                  if (!student) return null

                  const canSelect =
                    applicant.status === "APPLIED"

                  return (
                    <TableRow key={applicant.id}>
                      {/* Selection */}

                      <TableCell>
                        <Checkbox
                          disabled={!canSelect}
                          checked={
                            !!selectedApplicantIds[
                              applicant.id
                            ]
                          }
                          onCheckedChange={(checked) => {
                            setSelectedApplicantIds(
                              (previous) => ({
                                ...previous,
                                [applicant.id]:
                                  checked === true,
                              })
                            )
                          }}
                          aria-label={`Select ${student.name}`}
                        />
                      </TableCell>

                      {/* Candidate */}

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                            {student.name
                              ?.split(" ")
                              .slice(0, 2)
                              .map(
                                (part: string) =>
                                  part[0]
                              )
                              .join("")}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {student.name}
                            </p>

                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {student.enrollment_no}
                            </p>

                            {student.resume_url && (
                              <a
                                href={student.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <IconFileText className="size-3" />

                                Resume

                                <IconExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* CGPA */}

                      <TableCell>
                        <span className="font-medium">
                          {student.cgpa ?? "—"}
                        </span>
                      </TableCell>

                      {/* Backlogs */}

                      <TableCell>
                        {student.active_backlogs > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
                          >
                            {student.active_backlogs}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            0
                          </span>
                        )}
                      </TableCell>

                      {/* Mock score */}

                      <TableCell>
                        {applicant.mock_score !== null ? (
                          <span className="font-mono text-sm font-medium">
                            {applicant.mock_score}
                            <span className="text-muted-foreground">
                              /100
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}

                      <TableCell>
                        {getStatusBadge(
                          applicant.status
                        )}
                      </TableCell>

                      {/* Actions */}

                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {applicant.status ===
                            "APPLIED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleShortlistApplicant(
                                  applicant.id
                                )
                              }
                            >
                              <IconCheck className="size-4" />
                              Shortlist
                            </Button>
                          )}

                          {applicant.status ===
                            "SHORTLISTED" &&
                            !(
                              applicant.offer &&
                              applicant.offer.status ===
                                "EXTENDED"
                            ) && (
                              <>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    ₹
                                  </span>

                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder="CTC"
                                    aria-label={`CTC offer amount for ${student?.name || "applicant"}`}
                                    value={
                                      extendCtcValues[
                                        applicant.id
                                      ] || ""
                                    }
                                    onChange={(event) =>
                                      setExtendCtcValues({
                                        ...extendCtcValues,
                                        [applicant.id]:
                                          event.target.value,
                                      })
                                    }
                                    className="h-8 w-24 pl-6 text-xs"
                                  />
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleExtendOffer(
                                      applicant.id
                                    )
                                  }
                                  disabled={
                                    !extendCtcValues[
                                      applicant.id
                                    ]
                                  }
                                >
                                  <IconSend className="size-4" />
                                  Offer
                                </Button>
                              </>
                            )}

                          {applicant.offer?.status ===
                            "EXTENDED" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleRevokeOffer(
                                  applicant.offer!.id
                                )
                              }
                            >
                              <IconBan className="size-4" />
                              Revoke
                            </Button>
                          )}

                          {applicant.status ===
                            "OFFERED" &&
                            applicant.offer?.status !==
                              "EXTENDED" && (
                              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <IconCircleCheck className="size-4" />
                                Hired
                              </div>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}