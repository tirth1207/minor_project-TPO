"use client"

import * as React from "react"
import { useCompany } from "../company-context"
import { IconPlus } from "@tabler/icons-react"

export default function CompanyPostJobPage() {
  const {
    companyStatus,
    jobTitle,
    setJobTitle,
    jobDesc,
    setJobDesc,
    jobLocation,
    setJobLocation,
    workMode,
    setWorkMode,
    ctc,
    setCtc,
    minCgpa,
    setMinCgpa,
    maxBacklogs,
    setMaxBacklogs,
    requireMock,
    setRequireMock,
    mockPassScore,
    setMockPassScore,
    postingJob,
    handleCreateJob,
  } = useCompany()

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background max-w-3xl">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <IconPlus className="h-5 w-5 text-zinc-400" /> Create Campus Recruitment Drive
      </h3>
      <form onSubmit={handleCreateJob} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Job Title *</label>
          <input
            type="text"
            placeholder="e.g. Software Engineer (Frontend)"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Detailed Description *</label>
          <textarea
            placeholder="Type role description, requirements, and responsibilities..."
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-secondary p-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Work Location *</label>
          <input
            type="text"
            placeholder="e.g. Bangalore, India"
            value={jobLocation}
            onChange={e => setJobLocation(e.target.value)}
            className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Work Mode *</label>
          <select
            value={workMode}
            onChange={e => setWorkMode(e.target.value as any)}
            className="w-full h-9 rounded-lg border border-secondary px-2.5 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          >
            <option value="ONSITE">Onsite</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Package offered (CTC in LPA) *</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 12"
            value={ctc}
            onChange={e => setCtc(e.target.value)}
            className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Minimum Eligible CGPA *</label>
          <input
            type="number"
            step="0.01"
            min="0.00"
            max="10.00"
            value={minCgpa}
            onChange={e => setMinCgpa(e.target.value)}
            className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Maximum Allowed Backlogs *</label>
          <input
            type="number"
            min="0"
            value={maxBacklogs}
            onChange={e => setMaxBacklogs(e.target.value)}
            className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900 dark:text-zinc-50"
            required
          />
        </div>
        <div className="flex flex-col justify-end pb-1">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={requireMock}
              onChange={e => setRequireMock(e.target.checked)}
              className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
            />
            Require passing AI Mock interview
          </label>
        </div>

        {requireMock && (
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">Mock Pass Score Gate (0 - 100) *</label>
            <input
              type="number"
              min="0"
              max="100"
              value={mockPassScore}
              onChange={e => setMockPassScore(e.target.value)}
              className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900"
              required
            />
          </div>
        )}

        <div className="sm:col-span-2 pt-2 text-right">
          <button
            type="submit"
            disabled={postingJob || companyStatus !== "ACTIVE"}
            className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
          >
            {postingJob ? "Publishing Drive..." : "Publish Job Drive"}
          </button>
        </div>
      </form>
    </div>
  )
}
