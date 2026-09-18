"use client"

import * as React from "react"
import {
  IconAward,
  IconBriefcase,
  IconBuilding,
  IconCalendarEvent,
  IconCircleCheck,
  IconClock,
  IconFileCertificate,
  IconMapPin,
  IconTarget,
  IconX,
} from "@tabler/icons-react"

import { useStudent } from "../student-context"

function formatLpa(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"

  const lpa = value >= 100000 ? value / 100000 : value

  return Number.isInteger(lpa)
    ? lpa.toString()
    : lpa.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getStatusConfig(status: string) {
  const normalized = status?.toUpperCase()

  switch (normalized) {
    case "APPLIED":
      return {
        label: "Applied",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-400",
        dot: "bg-blue-500",
      }

    case "SHORTLISTED":
      return {
        label: "Shortlisted",
        className:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-400",
        dot: "bg-violet-500",
      }

    case "OFFERED":
      return {
        label: "Offer Received",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400",
        dot: "bg-emerald-500",
      }

    case "ACCEPTED":
      return {
        label: "Accepted",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400",
        dot: "bg-emerald-500",
      }

    case "REJECTED":
      return {
        label: "Rejected",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400",
        dot: "bg-red-500",
      }

    case "WITHDRAWN":
      return {
        label: "Withdrawn",
        className:
          "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
        dot: "bg-zinc-500",
      }

    default:
      return {
        label: normalized || "Unknown",
        className:
          "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400",
        dot: "bg-zinc-500",
      }
  }
}

function getRoundConfig(status: string) {
  const normalized = status?.toUpperCase()

  switch (normalized) {
    case "CLEARED":
      return {
        label: "Cleared",
        className:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        icon: IconCircleCheck,
      }

    case "SCHEDULED":
      return {
        label: "Scheduled",
        className:
          "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
        icon: IconClock,
      }

    case "REJECTED":
      return {
        label: "Rejected",
        className:
          "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
        icon: IconX,
      }

    default:
      return {
        label: normalized || "Pending",
        className:
          "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
        icon: IconClock,
      }
  }
}

export default function StudentApplicationsPage() {
  const {
    applications,
    handleDecideOffer,
  } = useStudent()

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <IconFileCertificate className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Application History
          </h2>
        </div>

        <p className="pl-11 text-sm text-zinc-500 dark:text-zinc-400">
          Track your campus applications, recruitment rounds, and offers.
        </p>
      </div>

      {/* Applications */}
      {applications.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-background dark:border-zinc-800">
            <IconBriefcase className="h-6 w-6 text-zinc-400" />
          </div>

          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            No applications yet
          </h3>

          <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Applications you submit through campus drives will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((app) => {
            const job = app.job_college_mapping?.job

            if (!job) return null

            const offers = Array.isArray(app.offers)
              ? app.offers
              : app.offers
                ? [app.offers]
                : []

            const activeOffer = offers.find(
              (offer) => offer.status === "EXTENDED"
            )

            const offerAccepted = offers.find(
              (offer) => offer.status === "ACCEPTED"
            )

            const offerRejected = offers.find(
              (offer) => offer.status === "REJECTED"
            )

            const status = getStatusConfig(app.status)

            const rounds = app.rounds || []

            const completedRounds = rounds.filter(
              (round) => round.status === "CLEARED"
            ).length

            return (
              <article
                key={app.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-background shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:hover:border-zinc-700"
              >
                {/* Application Header */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        {/* Company Icon */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                          <IconBuilding className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {job.title}
                          </h3>

                          <p className="mt-0.5 truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {job.company?.company_name}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <span
                        className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${status.className}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />
                        {status.label}
                      </span>
                    </div>

                    {/* Job Metadata */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/70">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          <IconTarget className="h-3.5 w-3.5" />
                          Package
                        </div>

                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          ₹{formatLpa(job.ctc_min)}–{formatLpa(job.ctc_max)} LPA
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/70">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          <IconMapPin className="h-3.5 w-3.5" />
                          Location
                        </div>

                        <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {job.location || "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/70">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          <IconBriefcase className="h-3.5 w-3.5" />
                          Work Mode
                        </div>

                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {job.work_mode || "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/70">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          <IconCalendarEvent className="h-3.5 w-3.5" />
                          Applied
                        </div>

                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {formatDate(app.applied_at)}
                        </p>
                      </div>
                    </div>

                    {/* Mock Score */}
                    {app.mock_score !== null &&
                      app.mock_score !== undefined && (
                        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/30">
                              <IconTarget className="h-4 w-4 text-violet-500" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                Mock Assessment Score
                              </p>

                              <p className="text-[11px] text-zinc-400">
                                Pre-placement assessment
                              </p>
                            </div>
                          </div>

                          <span className="text-lg font-black text-violet-600 dark:text-violet-400">
                            {app.mock_score}
                            <span className="text-xs font-semibold text-zinc-400">
                              /100
                            </span>
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Recruitment Rounds */}
                <div className="border-t border-zinc-100 px-5 py-5 dark:border-zinc-900 sm:px-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Recruitment Progress
                      </h4>

                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {rounds.length > 0
                          ? `${completedRounds} of ${rounds.length} rounds cleared`
                          : "No rounds scheduled yet"}
                      </p>
                    </div>

                    {rounds.length > 0 && (
                      <span className="text-xs font-bold text-zinc-400">
                        {completedRounds}/{rounds.length}
                      </span>
                    )}
                  </div>

                  {rounds.length > 0 ? (
                    <div className="flex flex-col">
                      {rounds.map((round, index) => {
                        const config = getRoundConfig(round.status)
                        const RoundIcon = config.icon
                        const isLast = index === rounds.length - 1

                        return (
                          <div
                            key={round.id}
                            className="relative flex gap-3 pb-4 last:pb-0"
                          >
                            {!isLast && (
                              <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-zinc-200 dark:bg-zinc-800" />
                            )}

                            <div
                              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.className}`}
                            >
                              <RoundIcon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1 rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-900 dark:bg-zinc-900/40">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                  {round.round_name}
                                </p>

                                <span
                                  className={`w-fit rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.className}`}
                                >
                                  {config.label}
                                </span>
                              </div>

                              {round.company_feedback && (
                                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                                  {round.company_feedback}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // <div className="rounded-xl border border-dashed border-zinc-200 py-6 text-center dark:border-zinc-800">
                    //   <IconClock className="mx-auto h-5 w-5 text-zinc-300 dark:text-zinc-700" />

                    //   <p className="mt-2 text-xs font-medium text-zinc-400">
                    //     Recruitment rounds haven't been scheduled yet.
                    //   </p>
                    // </div>
                    null
                  )}
                </div>

                {/* Active Offer */}
                {activeOffer && (
                  <div className="border-t border-emerald-100 bg-emerald-50/50 p-5 dark:border-emerald-950/50 dark:bg-emerald-950/20 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                          <IconAward className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                            You have an offer!
                          </p>

                          <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                            {job.company?.company_name} has extended an offer
                            worth{" "}
                            <strong>
                              ₹{formatLpa(activeOffer.ctc_offered)} LPA
                            </strong>
                            .
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDecideOffer(activeOffer.id, "ACCEPTED")
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <IconCircleCheck className="h-4 w-4" />
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDecideOffer(activeOffer.id, "REJECTED")
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-background px-4 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                        >
                          <IconX className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accepted Offer */}
                {offerAccepted && (
                  <div className="border-t border-emerald-100 bg-emerald-50/40 px-5 py-4 dark:border-emerald-950/50 dark:bg-emerald-950/20 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <IconCircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Offer accepted
                        </p>

                        <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                          ₹{formatLpa(offerAccepted.ctc_offered)} LPA package ·
                          You're hired!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejected Offer */}
                {offerRejected && (
                  <div className="border-t border-rose-100 bg-rose-50/40 px-5 py-4 dark:border-rose-950/50 dark:bg-rose-950/20 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                        <IconX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                          Offer declined
                        </p>

                        <p className="text-[11px] text-rose-700/70 dark:text-rose-400/70">
                          ₹{formatLpa(offerRejected.ctc_offered)} LPA package
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-900 sm:px-6">
                  <p className="text-[10px] font-medium text-zinc-400">
                    Application ID · {app.id.slice(0, 8)}...
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}