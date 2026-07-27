"use client"

import * as React from "react"
import { useCollegeAdmin } from "../college-admin-context"
import { IconUsers, IconExternalLink } from "@tabler/icons-react"

export default function CollegeAdminStudentsPage() {
  const { students } = useCollegeAdmin()

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background flex flex-col gap-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconUsers className="h-5 w-5 text-zinc-400" /> Complete Student Directory
      </h3>
      {students.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">
          No student profiles registered under your institution yet.
        </p>
      ) : (
        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
              <tr>
                <th className="p-3">Candidate Details</th>
                <th className="p-3">Branch & Semester</th>
                <th className="p-3">Academic Performance</th>
                <th className="p-3">Validation Status</th>
                <th className="p-3">Placement State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {students.map((student) => {
                return (
                  <tr key={student.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                    <td className="p-3 text-xs">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {student.name}
                      </p>
                      <p className="text-zinc-400 font-mono mt-0.5">{student.enrollment_no}</p>
                      <a
                        href={student.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1 font-semibold"
                      >
                        Inspect Resume <IconExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>
                    <td className="p-3 text-xs text-zinc-800 dark:text-zinc-300 font-semibold">
                      <p>{student.branch}</p>
                      <p className="text-zinc-400 font-normal">Semester {student.semester}</p>
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      <p>
                        CGPA: <span className="font-bold">{student.cgpa}</span>
                      </p>
                      <p>
                        Backlogs:{" "}
                        <span className="font-bold text-rose-500">{student.active_backlogs}</span>
                      </p>
                    </td>
                    <td className="p-3">
                      {student.profile_status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                          Verified Profile
                        </span>
                      ) : student.profile_status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                          Pending Verification
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {student.is_placed ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Placed 🎉
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-650 dark:bg-zinc-900 dark:text-zinc-400">
                          Unplaced
                        </span>
                      )}
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
