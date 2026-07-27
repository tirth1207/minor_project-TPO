"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconBriefcase } from "@tabler/icons-react"

export default function StudentJobsPage() {
  const {
    profile,
    eligibleJobs,
    applications,
    handleApplyJob,
  } = useStudent()

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background flex flex-col gap-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconBriefcase className="h-5 w-5 text-zinc-400" /> Matches Campus Placements
      </h3>
      {eligibleJobs.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No active jobs mapped or you do not fulfill academic gates for current drives.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eligibleJobs.map(mapping => {
            const job = mapping.job
            const alreadyApplied = applications.some(app => app.job_college_mapping?.id === mapping.id)
            return (
              <div key={mapping.id} className="rounded-xl border border-zinc-150 bg-zinc-50/20 p-5 flex flex-col gap-3 dark:border-zinc-850 dark:bg-zinc-900/5 hover:shadow-sm transition-all">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">₹{job.ctc_max} LPA Package</span>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{job.title}</h4>
                  <p className="text-xs text-zinc-500">{job.company?.company_name || "Enterprise Corporate Partner"}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                </div>

                <div className="text-[11px] leading-relaxed text-zinc-500 py-1 border-t border-b border-zinc-100 dark:border-zinc-900">
                  <p className="line-clamp-2">{job.description}</p>
                  <p className="text-[10px] text-zinc-400 mt-1 font-semibold">Eligibility: {job.min_cgpa} CGPA • Max {job.max_backlogs} Backlogs</p>
                  {job.require_mock && (
                    <p className="text-[9px] text-amber-600 font-bold mt-0.5">* Passing AI Mock Required ({job.mock_pass_score}%+)</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-zinc-400 font-semibold">{mapping.applicant_count} Applicants</span>

                  {alreadyApplied ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Applied ✓</span>
                  ) : (
                    <button
                      onClick={() => handleApplyJob(mapping.id)}
                      disabled={!profile || profile.profile_status !== "APPROVED"}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                    >
                      1-Click Apply
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
