"use client"

import * as React from "react"
import { useMentor } from "../mentor-context"
import { IconUsers, IconUserCheck } from "@tabler/icons-react"

export default function MentorOverviewPage() {
  const { students } = useMentor()
  const pendingCount = students.filter(s => s.profile_status === "PENDING").length
  const approvedCount = students.filter(s => s.profile_status === "APPROVED").length
  const placedCount = students.filter(s => s.is_placed).length

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Stat 1 */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Recruits</span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{students.length}</h3>
          <span className="text-xs text-zinc-500 mt-0.5 block">Managed in your department</span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
          <IconUsers className="h-6 w-6" />
        </div>
      </div>

      {/* Stat 2 */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Verification</span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-amber-600 dark:text-amber-400">{pendingCount}</h3>
          <span className="text-xs text-zinc-550 mt-0.5 block">Action required</span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-amber-50/50 text-amber-600 flex items-center justify-center dark:bg-amber-900/10">
          <IconUserCheck className="h-6 w-6" />
        </div>
      </div>

      {/* Stat 3 */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placed Candidates</span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">{placedCount} of {approvedCount || 1}</h3>
          <span className="text-xs text-zinc-500 mt-0.5 block">Approved recruits placed</span>
        </div>
        <div className="h-11 w-11 rounded-xl bg-emerald-50/50 text-emerald-600 flex items-center justify-center dark:bg-emerald-900/10">
          <IconUsers className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
