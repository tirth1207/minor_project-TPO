"use client"

import * as React from "react"
import { useSuperAdmin } from "../super-admin-context"
import { IconCheck, IconX } from "@tabler/icons-react"

export default function SuperAdminJobsPage() {
  const {
    jobs,
    handleUpdateJobStatus,
  } = useSuperAdmin()

  const renderStatusBadge = (status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>Approved</span>
    } else if (status === "PENDING") {
      return <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>Pending</span>
    } else {
      return <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>Rejected</span>
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold">Global Job Postings</h3>
      <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
            <tr>
              <th className="p-3">Job Details</th>
              <th className="p-3">Company</th>
              <th className="p-3">Package / CTC</th>
              <th className="p-3">Criteria & Branches</th>
              <th className="p-3">Global Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-zinc-400">No job postings found.</td>
              </tr>
            ) : (
              jobs.map(job => (
                <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                  <td className="p-3">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[200px] truncate">{job.description}</p>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">{job.company?.company_name || "Unknown Company"}</span>
                  </td>
                  <td className="p-3 font-semibold">
                    {job.ctc_min && job.ctc_max ? `₹${job.ctc_min} - ₹${job.ctc_max} LPA` : "Not specified"}
                  </td>
                  <td className="p-3 text-xs text-zinc-500 flex flex-col gap-1">
                    <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                    <p>Max Backlogs: <span className="font-bold">{job.max_backlogs}</span></p>
                    <p className="text-[10px] leading-tight text-zinc-400 max-w-[150px] truncate" title={job.job_eligible_branches?.map(b => b.branch_name).join(", ")}>
                      {job.job_eligible_branches && job.job_eligible_branches.length > 0
                        ? job.job_eligible_branches.map(b => b.branch_name).join(", ")
                        : "All branches"
                      }
                    </p>
                  </td>
                  <td className="p-3">
                    {renderStatusBadge(job.global_status)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {job.global_status !== "APPROVED" && (
                        <button
                          onClick={() => handleUpdateJobStatus(job.id, "APPROVED")}
                          className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <IconCheck className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                      {job.global_status !== "REJECTED" && (
                        <button
                          onClick={() => handleUpdateJobStatus(job.id, "REJECTED")}
                          className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                        >
                          <IconX className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
