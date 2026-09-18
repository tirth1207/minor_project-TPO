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
    requiredSkills,
    setRequiredSkills,
    postingJob,
    handleCreateJob,
  } = useCompany()

  const [skillInput, setSkillInput] = React.useState("")

  const addSkills = (value: string) => {
    const incoming = value.split(",").map((skill) => skill.trim()).filter(Boolean)
    if (incoming.length === 0) return
    setRequiredSkills([...new Set([...requiredSkills, ...incoming])])
    setSkillInput("")
  }

  const handleSkillKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      addSkills(skillInput)
    }
  }

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
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-zinc-400 block mb-1">Required Skills</label>
          <div className="w-full min-h-9 rounded-lg border border-secondary px-2 py-1.5 focus-within:ring-1 focus-within:ring-primary dark:border-secondary dark:bg-zinc-900 flex flex-wrap items-center gap-1.5">
            {requiredSkills.map((skill) => (
              <span key={skill} className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                {skill}
                <button type="button" onClick={() => setRequiredSkills(requiredSkills.filter((item) => item !== skill))} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" aria-label={`Remove ${skill}`}>
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              onBlur={() => addSkills(skillInput)}
              placeholder={requiredSkills.length ? "Add another skill..." : "Type a skill and press Enter or use commas..."}
              className="min-w-[220px] flex-1 h-7 bg-transparent px-1 text-sm outline-none dark:text-zinc-50"
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Each skill is stored as an array value and is used by the student eligibility engine.</p>
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
