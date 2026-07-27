"use client"

import * as React from "react"
import { useSuperAdmin } from "../super-admin-context"
import {
  IconSchool,
  IconBuilding,
  IconBriefcase,
  IconCheck,
  IconX,
  IconExternalLink
} from "@tabler/icons-react"

export default function SuperAdminOverviewPage() {
  const {
    organizations,
    companies,
    jobs,
    handleUpdateOrgStatus,
    handleUpdateCompanyStatus,
    handleUpdateJobStatus,
  } = useSuperAdmin()

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Pending Colleges & Departments */}
      <div className="rounded-2xl border border-secondary bg-background dark:border-secondary dark:bg-background p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconSchool className="h-5 w-5 text-zinc-400" /> Pending College Approvals
        </h3>
        <div className="flex-1 overflow-auto max-h-[300px]">
          {organizations.filter(o => o.status === "PENDING").length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No colleges pending approval.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {organizations.filter(o => o.status === "PENDING").map(org => (
                <div key={org.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-sm">{org.name}</p>
                    <p className="text-xs text-zinc-400">Created: {new Date(org.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleUpdateOrgStatus(org.id, "ACTIVE")}
                      className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer"
                      title="Approve"
                    >
                      <IconCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateOrgStatus(org.id, "REJECTED")}
                      className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer"
                      title="Reject"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Company Profiles */}
      <div className="rounded-2xl border border-secondary bg-background dark:border-secondary dark:bg-background p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconBuilding className="h-5 w-5 text-zinc-400" /> Pending Company Registrations
        </h3>
        <div className="flex-1 overflow-auto max-h-[300px]">
          {companies.filter(c => c.status === "PENDING").length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No companies pending registration.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {companies.filter(c => c.status === "PENDING").map(comp => (
                <div key={comp.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-sm">{comp.company_name}</p>
                    {comp.website && (
                      <a
                        href={comp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                      >
                        {comp.website} <IconExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleUpdateCompanyStatus(comp.id, "ACTIVE")}
                      className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer"
                      title="Approve"
                    >
                      <IconCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateCompanyStatus(comp.id, "REJECTED")}
                      className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer"
                      title="Reject"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Job Postings (Global status) */}
      <div className="rounded-2xl border border-secondary bg-background dark:border-secondary dark:bg-background p-6 flex flex-col gap-4 lg:col-span-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconBriefcase className="h-5 w-5 text-zinc-400" /> Pending Global Job Approvals
        </h3>
        <div className="overflow-auto max-h-[350px]">
          {jobs.filter(j => j.global_status === "PENDING").length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No job postings pending global approval.</p>
          ) : (
            <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                  <tr>
                    <th className="p-3">Job Details</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Package / CTC</th>
                    <th className="p-3">Criteria (CGPA/Backlogs)</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {jobs.filter(j => j.global_status === "PENDING").map(job => (
                    <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                      <td className="p-3">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-300">{job.company?.company_name || "Unknown Company"}</span>
                      </td>
                      <td className="p-3 font-medium">
                        {job.ctc_min && job.ctc_max ? `₹${job.ctc_min} - ₹${job.ctc_max} LPA` : "Not specified"}
                      </td>
                      <td className="p-3 text-xs text-zinc-500">
                        <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                        <p>Max Backlogs: <span className="font-bold">{job.max_backlogs}</span></p>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, "APPROVED")}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <IconCheck className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, "REJECTED")}
                            className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <IconX className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
