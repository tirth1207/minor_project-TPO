"use client"

import * as React from "react"
import { useCompany } from "../company-context"
import {
  IconBriefcase,
  IconUsers,
  IconCircleCheck,
  IconExternalLink,
  IconCheck,
  IconSend,
  IconBan
} from "@tabler/icons-react"

export default function CompanyApplicantsPage() {
  const {
    jobs,
    selectedJobId,
    setSelectedJobId,
    applicants,
    selectedApplicantIds,
    setSelectedApplicantIds,
    extendCtcValues,
    setExtendCtcValues,
    handleShortlistApplicant,
    handleBulkShortlist,
    handleExtendOffer,
    handleRevokeOffer,
  } = useCompany()

  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* Jobs list sidebar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
        <h3 className="text-md font-bold flex items-center gap-2">
          <IconBriefcase className="h-4.5 w-4.5 text-zinc-400" /> Target Openings
        </h3>
        <div className="flex flex-col gap-2">
          {jobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedJobId === job.id
                ? 'bg-zinc-900 border-zinc-900 text-zinc-55 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950'
                : 'border-zinc-150 hover:bg-zinc-50 text-zinc-600 dark:border-zinc-850 dark:hover:bg-zinc-900'
                }`}
            >
              <p className="font-bold truncate">{job.title}</p>
              <p className="text-[10px] opacity-75 mt-0.5">{job.location} • Status: {job.global_status}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Applicants details directory */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3 border-zinc-100 dark:border-zinc-900">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <IconUsers className="h-5 w-5 text-zinc-400" /> Candidates Roster
          </h3>
          {Object.values(selectedApplicantIds).some(Boolean) && (
            <button
              onClick={handleBulkShortlist}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-zinc-55 text-xs font-semibold hover:bg-emerald-500 transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <IconCircleCheck className="h-4 w-4" /> Bulk Shortlist
            </button>
          )}
        </div>

        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={applicants.length > 0 && applicants.every(a => selectedApplicantIds[a.id])}
                    onChange={e => {
                      const updated: Record<string, boolean> = {}
                      if (e.target.checked) {
                        applicants.forEach(a => {
                          if (a.status === "APPLIED") updated[a.id] = true
                        })
                      }
                      setSelectedApplicantIds(updated)
                    }}
                    className="rounded border-zinc-300"
                  />
                </th>
                <th className="p-3">Candidate Details</th>
                <th className="p-3">Metrics (CGPA/Backlogs)</th>
                <th className="p-3">Mock Score</th>
                <th className="p-3">Application Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {applicants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-zinc-400">No applicants have registered for this drive yet.</td>
                </tr>
              ) : (
                applicants.map(applicant => {
                  const s = applicant.student
                  if (!s) return null
                  return (
                    <tr key={applicant.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          disabled={applicant.status !== "APPLIED"}
                          checked={!!selectedApplicantIds[applicant.id]}
                          onChange={e => {
                            setSelectedApplicantIds(prev => ({
                              ...prev,
                              [applicant.id]: e.target.checked
                            }))
                          }}
                          className="rounded border-zinc-300 disabled:opacity-50"
                        />
                      </td>
                      <td className="p-3 text-xs">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.name}</p>
                        <p className="text-zinc-400 font-mono mt-0.5">{s.enrollment_no}</p>
                        <a
                          href={s.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1 font-semibold"
                        >
                          View Resume <IconExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </td>
                      <td className="p-3 text-xs text-zinc-500">
                        <p>CGPA: <span className="font-bold">{s.cgpa}</span></p>
                        <p>Backlogs: <span className="font-bold text-rose-500">{s.active_backlogs}</span></p>
                      </td>
                      <td className="p-3 font-mono font-bold text-sm">
                        {applicant.mock_score !== null ? `${applicant.mock_score}/100` : <span className="text-zinc-400 text-xs">N/A</span>}
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-bold uppercase tracking-wider">{applicant.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {applicant.status === "APPLIED" && (
                            <button
                              onClick={() => handleShortlistApplicant(applicant.id)}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-0.5"
                            >
                              <IconCheck className="h-3.5 w-3.5" /> Shortlist
                            </button>
                          )}

                          {applicant.status === "SHORTLISTED" && (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="Package Offered (LPA)"
                                value={extendCtcValues[applicant.id] || ""}
                                onChange={e => setExtendCtcValues({
                                  ...extendCtcValues,
                                  [applicant.id]: e.target.value
                                })}
                                className="w-24 h-7 border rounded text-[10px] px-2 text-center"
                              />
                              <button
                                onClick={() => handleExtendOffer(applicant.id)}
                                className="px-2 py-1 rounded bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer inline-flex items-center gap-0.5"
                              >
                                <IconSend className="h-3 w-3" /> Offer
                              </button>
                            </div>
                          )}

                          {applicant.offer && applicant.offer.status === "EXTENDED" && (
                            <button
                              onClick={() => handleRevokeOffer(applicant.offer!.id)}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-0.5"
                            >
                              <IconBan className="h-3 w-3" /> Revoke
                            </button>
                          )}

                          {applicant.status === "OFFERED" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Hired 🎉</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
