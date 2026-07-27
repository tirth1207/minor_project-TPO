"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconUser, IconExclamationCircle } from "@tabler/icons-react"

export default function StudentProfilePage() {
  const {
    editName,
    setEditName,
    editCgpa,
    setEditCgpa,
    editBranch,
    setEditBranch,
    editSemester,
    setEditSemester,
    editPhone,
    setEditPhone,
    editResumeUrl,
    setEditResumeUrl,
    editBio,
    setEditBio,
    updatingProfile,
    handleUpdateProfile,
  } = useStudent()

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 max-w-3xl">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
        <IconUser className="h-5 w-5 text-zinc-400" /> Manage Candidate Profile
      </h3>
      <p className="text-xs text-zinc-400 mb-4">Overwrite your candidate records. Be accurate and professional.</p>

      <div className="rounded-xl border border-amber-250 bg-amber-50/20 p-4 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-400 mb-5 flex gap-2.5">
        <IconExclamationCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">CRITICAL WARNING REGARDING FIELD MODIFICATION:</p>
          <p className="mt-0.5">Modifying your **Name**, **Cumulative CGPA**, or **Resume Link URL** represents an academic alteration. Upon saving, database triggers will automatically revert your profile status back to **PENDING** verification and temporarily lock job application submissions.</p>
        </div>
      </div>

      <form onSubmit={handleUpdateProfile} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Full Name *</label>
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Cumulative CGPA *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={editCgpa}
            onChange={e => setEditCgpa(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Branch *</label>
          <input
            type="text"
            value={editBranch}
            onChange={e => setEditBranch(e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Current Semester *</label>
          <select
            value={editSemester}
            onChange={e => setEditSemester(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 px-2.5 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
            required
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Contact Phone</label>
          <input
            type="text"
            value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Academic Resume Link URL *</label>
          <input
            type="url"
            value={editResumeUrl}
            onChange={e => setEditResumeUrl(e.target.value)}
            placeholder="e.g. https://drive.google.com/..."
            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Professional Bio</label>
          <textarea
            value={editBio}
            onChange={e => setEditBio(e.target.value)}
            rows={3}
            placeholder="Write a brief professional summary about yourself..."
            className="w-full rounded-lg border border-zinc-200 p-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <div className="sm:col-span-2 pt-2 text-right">
          <button
            type="submit"
            disabled={updatingProfile}
            className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
          >
            {updatingProfile ? "Saving Profile..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
