"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconBriefcase, IconAlertTriangle } from "@tabler/icons-react"

export default function StudentJobsPage() {
  const {
    profile,
    jobs,
    applications,
    handleApplyJob,
  } = useStudent()

  const isApproved = profile && profile.profile_status === "APPROVED"

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-55">
          <IconBriefcase className="h-5 w-5 text-zinc-400" /> Matches Campus Placements
        </h3>
        <p className="text-xs text-zinc-400">
          View all job postings approved by your college. You can apply to recruitment drives for which you meet eligibility requirements.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No active job postings available.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((jobItem) => {
            const { job, mapping, applicant_count, is_eligible, eligibility_reasons } = jobItem
            const alreadyApplied = mapping
              ? applications.some(
                  (app) => app.job_college_mapping?.id === mapping.id
                )
              : false

            const isEligible = is_eligible !== false
            const reasons = eligibility_reasons || { branch: true, cgpa: true, backlogs: true }

            return (
              <div
                key={job.id}
                className="rounded-xl border border-zinc-150 bg-zinc-50/20 p-5 flex flex-col gap-3 dark:border-zinc-850 dark:bg-zinc-900/5 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      ₹{job.ctc_max} LPA Package
                    </span>
                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                      {job.title}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {job.company?.company_name || "Enterprise Corporate Partner"}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {job.location} • {job.work_mode}
                    </p>
                  </div>

                  {isEligible ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Eligible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Ineligible
                    </span>
                  )}
                </div>

                <div className="text-[11px] leading-relaxed text-zinc-500 py-1 border-t border-b border-zinc-100 dark:border-zinc-900 flex flex-col gap-2">
                  <p className="line-clamp-2">{job.description}</p>

                  <div className="text-[10px] text-zinc-400 mt-1">
                    <p className="font-semibold text-zinc-500 dark:text-zinc-300">Eligibility Requirements:</p>
                    <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                      <li>Branches: {job.branches?.map(b => b.branch_name).join(", ") || "All"}</li>
                      <li>Min CGPA: {job.min_cgpa}</li>
                      <li>Max Backlogs: {job.max_backlogs}</li>
                    </ul>
                  </div>

                  {job.require_mock && (
                    <p className="text-[9px] text-amber-600 font-bold">
                      * Passing AI Mock Required ({job.mock_pass_score}%+)
                    </p>
                  )}

                  {/* If NOT eligible, show unmatched requirements clearly */}
                  {!isEligible && (
                    <div className="mt-1 flex flex-col gap-1 rounded-lg bg-zinc-100/50 border border-zinc-200/50 p-2 dark:bg-zinc-900/50 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                        <IconAlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Unmatched Criteria:
                      </p>
                      <ul className="text-[9px] text-rose-600 dark:text-rose-400 list-disc pl-3.5 space-y-0.5">
                        {!reasons.branch && (
                          <li>Branch '{profile?.branch}' is not eligible</li>
                        )}
                        {!reasons.cgpa && (
                          <li>CGPA too low (Requires min {job.min_cgpa}, yours is {profile?.cgpa})</li>
                        )}
                        {!reasons.backlogs && (
                          <li>Too many active backlogs (Allows max {job.max_backlogs}, yours is {profile?.active_backlogs})</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-[10px] text-zinc-400 font-semibold">
                    {applicant_count} Applicants
                  </span>

                  {alreadyApplied ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Applied ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => handleApplyJob(mapping?.id ?? null)}
                      disabled={
                        !isApproved ||
                        !mapping ||
                        !isEligible
                      }
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                    >
                      {!mapping
                        ? "Pending College Approval"
                        : !isApproved
                        ? "Profile Pending Approval"
                        : !isEligible
                        ? "Ineligible"
                        : "1-Click Apply"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
