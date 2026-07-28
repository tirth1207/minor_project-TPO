"use client"

import * as React from "react"
import { useCollegeAdmin } from "../college-admin-context"
import { IconPlus, IconCircleCheck, IconCopy, IconListCheck } from "@tabler/icons-react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CollegeAdminInvitesPage() {
  const {
    departments,
    invites,
    selectedDeptId,
    setSelectedDeptId,
    generatingInvite,
    latestInviteUrl,
    handleGenerateInvite,
    handleCopyLink,
  } = useCollegeAdmin()

  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* Generate magic invite token */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background flex flex-col gap-4">
        <h3 className="text-md font-bold flex items-center gap-2">
          <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> New Magic Link
        </h3>
        <form onSubmit={handleGenerateInvite} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">
              Target Department *
            </label>
            <Select 
              items={departments.filter((d) => d.status === "ACTIVE").map((d) => ({ value: d.id, label: d.name }))} 
              value={selectedDeptId} >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {departments
                    .filter((d) => d.status === "ACTIVE")
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {/* <Select
              value={selectedDeptId}
              // onValueChange={setSelectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full"
              required
            >
              <option value="">-- Choose Department --</option>
              {departments
                .filter((d) => d.status === "ACTIVE")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </Select> */}
          </div>
          <button
            type="submit"
            disabled={generatingInvite || !selectedDeptId}
            className="h-9 px-4 rounded-lg bg-primary text-foreground text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
          >
            {generatingInvite ? "Generating..." : "Generate Magic Invite"}
          </button>
        </form>

        {/* Copy Link Container */}
        {latestInviteUrl && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 text-xs text-emerald-800 dark:border-emerald-950/30 dark:bg-emerald-950/15 dark:text-emerald-400 mt-2 flex flex-col gap-2">
            <p className="font-bold flex items-center gap-1.5">
              <IconCircleCheck className="h-4 w-4" /> Copy Magic Invite Token Link
            </p>
            <input
              type="text"
              readOnly
              value={latestInviteUrl}
              className="w-full p-2 border rounded bg-background text-zinc-700 text-[11px] font-mono dark:bg-zinc-900 dark:border-secondary dark:text-zinc-300"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => handleCopyLink(latestInviteUrl)}
              className="w-full h-7 mt-1 border rounded bg-background text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-zinc-50 cursor-pointer dark:bg-zinc-900 dark:border-secondary"
            >
              <IconCopy className="h-3 w-3" /> Copy Link
            </button>
          </div>
        )}
      </div>

      {/* Generated Invites Table */}
      <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background md:col-span-2 flex flex-col gap-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconListCheck className="h-5 w-5 text-zinc-400" /> Active Invite Tokens
        </h3>
        {invites.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">
            No onboarding invite tokens generated yet. Choose a department to create one!
          </p>
        ) : (
          <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                <tr>
                  <th className="p-3">Department</th>
                  <th className="p-3">Invite Link Url</th>
                  <th className="p-3">Used Count</th>
                  <th className="p-3">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {invites.map((invite) => {
                  const absoluteLink = `${window.location.origin}/register?token=${invite.token}`
                  const isExpired = new Date(invite.expires_at) < new Date()
                  return (
                    <tr key={invite.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {invite.department?.name || "Unknown Department"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-550 truncate max-w-[150px] md:max-w-[200px]">
                            {absoluteLink}
                          </span>
                          <button
                            onClick={() => handleCopyLink(absoluteLink)}
                            className="p-1 rounded border hover:bg-zinc-50 text-zinc-550 dark:border-secondary"
                            title="Copy Link URL"
                          >
                            <IconCopy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-sm">{invite.used_count} recruits</td>
                      <td className="p-3 text-xs">
                        {isExpired ? (
                          <span className="text-rose-500 font-semibold">Expired</span>
                        ) : (
                          <span>{new Date(invite.expires_at).toLocaleDateString()}</span>
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
    </div>
  )
}
