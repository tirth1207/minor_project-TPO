"use client"

import * as React from "react"
import { useCompany } from "../company-context"
import { IconBriefcase } from "@tabler/icons-react"

export default function CompanyJobsPage() {
  const { jobs } = useCompany()

  const renderStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED" | string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>Approved</span>
    } else if (status === "PENDING") {
      return <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>Pending Approval</span>
    } else {
      return <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>Rejected</span>
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconBriefcase className="h-5 w-5 text-zinc-400" /> Active Campus Openings
      </h3>
      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">No jobs posted yet. Click &quot;Post New Opening&quot; tab above to get started!</p>
      ) : (
        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
              <tr>
                <th className="p-3">Job Details</th>
                <th className="p-3">Package (CTC)</th>
                <th className="p-3">Eligibility Gate</th>
                <th className="p-3">Global Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                  <td className="p-3">
                    <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[300px] truncate">{job.description}</p>
                  </td>
                  <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">
                    {job.ctc_max ? `₹${job.ctc_max} LPA` : "Not specified"}
                  </td>
                  <td className="p-3 text-xs text-zinc-500">
                    <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                    <p>Max Backlogs: <span className="font-bold text-rose-500">{job.max_backlogs}</span></p>
                    {job.require_mock && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">* AI Mock Gate Enabled ({job.mock_pass_score}+)</p>
                    )}
                  </td>
                  <td className="p-3">
                    {renderStatusBadge(job.global_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
