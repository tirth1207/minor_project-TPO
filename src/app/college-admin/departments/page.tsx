"use client"

import * as React from "react"
import { useCollegeAdmin } from "../college-admin-context"
import { IconPlus, IconSchool } from "@tabler/icons-react"

export default function CollegeAdminDepartmentsPage() {
  const {
    departments,
    deptName,
    setDeptName,
    submittingDept,
    handleCreateDept,
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
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* Create department form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
        <h3 className="text-md font-bold flex items-center gap-2">
          <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> New Department
        </h3>
        <form onSubmit={handleCreateDept} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">
              Department Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Science"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submittingDept || !deptName.trim()}
            className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
          >
            {submittingDept ? "Creating..." : "Create Department"}
          </button>
        </form>
      </div>

      {/* Departments List */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2 flex flex-col gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconSchool className="h-5 w-5 text-zinc-400" /> Department Directory
        </h3>
        {departments.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">
            No departments registered yet. Use the form to the left to register!
          </p>
        ) : (
          <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                <tr>
                  <th className="p-3">Department Name</th>
                  <th className="p-3">Created At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                    <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {dept.name}
                    </td>
                    <td className="p-3 text-xs text-zinc-455">
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">{renderStatusBadge(dept.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
