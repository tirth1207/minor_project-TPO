"use client"

import * as React from "react"
import { useSuperAdmin } from "../super-admin-context"
import { IconExternalLink } from "@tabler/icons-react"

export default function SuperAdminCompaniesPage() {
  const {
    companies,
    handleUpdateCompanyStatus,
  } = useSuperAdmin()

  const renderStatusBadge = (status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>Active</span>
    } else if (status === "PENDING") {
      return <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>Pending</span>
    } else {
      return <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>Rejected</span>
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
      <h3 className="text-lg font-bold">Registered Companies</h3>
      <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
            <tr>
              <th className="p-3">Company Name</th>
              <th className="p-3">Website</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-zinc-400">No companies registered.</td>
              </tr>
            ) : (
              companies.map(comp => (
                <tr key={comp.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-50">
                    {comp.company_name}
                  </td>
                  <td className="p-3">
                    {comp.website ? (
                      <a
                        href={comp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {comp.website} <IconExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400 text-xs">Not provided</span>
                    )}
                  </td>
                  <td className="p-3">
                    {renderStatusBadge(comp.status)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {comp.status !== "ACTIVE" && (
                        <button
                          onClick={() => handleUpdateCompanyStatus(comp.id, "ACTIVE")}
                          className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {comp.status !== "REJECTED" && (
                        <button
                          onClick={() => handleUpdateCompanyStatus(comp.id, "REJECTED")}
                          className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 text-xs font-semibold cursor-pointer"
                        >
                          Reject
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
