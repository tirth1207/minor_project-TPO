"use client"

import * as React from "react"
import { useCollegeAdmin } from "../college-admin-context"
import { IconBriefcase, IconExternalLink, IconCheck, IconX } from "@tabler/icons-react"

export default function CollegeAdminJobsPage() {
  const {
    jobMappings,
    handleUpdateJobStatus,
  } = useCollegeAdmin()

  const renderStatusBadge = (status: string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>
          Active
        </span>
      )
    } else if (status === "PENDING") {
      return (
        <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>
          Pending
        </span>
      )
    } else {
      return (
        <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>
          Rejected
        </span>
      )
    }
  }

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background flex flex-col gap-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconBriefcase className="h-5 w-5 text-zinc-400" /> Assigned Corporate Drives
      </h3>
      {jobMappings.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">
          No corporate drives assigned to your college yet. Published company drives will automatically map
          here.
        </p>
      ) : (
        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
              <tr>
                <th className="p-3">Corporate Partner</th>
                <th className="p-3">Drive Details</th>
                <th className="p-3">Package Offered</th>
                <th className="p-3">Eligibility Gates</th>
                <th className="p-3">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {jobMappings.map((mapping) => {
                const job = mapping.job
                if (!job) return null
                return (
                  <tr key={mapping.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                    <td className="p-3 text-xs">
                      <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                        {job.company?.company_name || "Enterprise Corporate Partner"}
                      </p>
                      {job.company?.website && (
                        <a
                          href={job.company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                        >
                          Visit Website <IconExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {job.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {job.location} • {job.work_mode}
                      </p>
                    </td>
                    <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">
                      {job.ctc_max ? `₹${job.ctc_max} LPA` : "Not specified"}
                    </td>
                    <td className="p-3 text-xs text-zinc-550">
                      <p>
                        Min CGPA: <span className="font-bold">{job.min_cgpa}</span>
                      </p>
                      <p>
                        Max Backlogs: <span className="font-bold text-rose-500">{job.max_backlogs}</span>
                      </p>
                      <p className="text-[10px] mt-1">
                        Branches:{" "}
                        <span className="font-semibold text-zinc-650 dark:text-zinc-400">
                          {job.branches?.map((b) => b.branch_name).join(", ") || "All branches"}
                        </span>
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {mapping.local_status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => handleUpdateJobStatus(mapping.id, "APPROVED")}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 hover:bg-emerald-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                            >
                              <IconCheck className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateJobStatus(mapping.id, "REJECTED")}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                            >
                              <IconX className="h-3.5 w-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {renderStatusBadge(mapping.local_status)}
                            <button
                              onClick={() => handleUpdateJobStatus(mapping.id, "PENDING")}
                              className="text-[10px] text-zinc-400 hover:text-zinc-900 underline"
                            >
                              Change Decision
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
