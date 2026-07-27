"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconFileCertificate, IconAward } from "@tabler/icons-react"

export default function StudentApplicationsPage() {
  const {
    applications,
    handleDecideOffer,
  } = useStudent()

  return (
    <div className="rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background flex flex-col gap-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <IconFileCertificate className="h-5 w-5 text-zinc-400" /> Campus Drives Application History
      </h3>
      {applications.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-12">You have not submitted any job applications yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {applications.map(app => {
            const job = app.job_college_mapping?.job
            if (!job) return null

            const activeOffer = app.offers?.find(o => o.status === "EXTENDED")
            const offerAccepted = app.offers?.find(o => o.status === "ACCEPTED")

            return (
              <div key={app.id} className="rounded-xl border border-secondary p-5 dark:border-secondary flex flex-col gap-4 bg-zinc-50/10">
                {/* App header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-zinc-100 dark:border-zinc-900">
                  <div>
                    <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</h4>
                    <p className="text-xs text-zinc-500">{job.company?.company_name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Application Status:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 uppercase tracking-wide">
                      {app.status}
                    </span>
                  </div>
                </div>

                {/* Job round timeline */}
                <div>
                  <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Round States Progress</h5>
                  <div className="flex flex-wrap gap-2">
                    {app.rounds && app.rounds.length > 0 ? (
                      app.rounds.map(round => (
                        <div key={round.id} className="px-3 py-2 rounded-lg border border-zinc-150 bg-background dark:border-zinc-850 dark:bg-zinc-900 text-xs flex flex-col gap-0.5">
                          <p className="font-bold text-zinc-800 dark:text-zinc-200">{round.round_name}</p>
                          <p className="text-[10px] font-extrabold text-primary uppercase">{round.status}</p>
                          {round.company_feedback && (
                            <p className="text-[9px] text-zinc-400 italic mt-0.5">Note: {round.company_feedback}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-400 italic">No recruitment timeline rounds scheduled yet.</p>
                    )}
                  </div>
                </div>

                {/* Offer Section */}
                {activeOffer && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm text-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-400 animate-pulse">
                    <div>
                      <p className="font-bold flex items-center gap-1"><IconAward className="h-5 w-5" /> Campus Placement Offer Extended! 🎉</p>
                      <p className="text-xs mt-0.5">Corporate partner is extending an official job offer with an package package of **₹{activeOffer.ctc_offered} LPA**.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDecideOffer(activeOffer.id, "ACCEPTED")}
                        className="h-8 px-4 rounded-lg bg-emerald-600 text-zinc-55 text-xs font-semibold hover:bg-emerald-550 transition-all cursor-pointer"
                      >
                        Accept Offer
                      </button>
                      <button
                        onClick={() => handleDecideOffer(activeOffer.id, "REJECTED")}
                        className="h-8 px-4 rounded-lg bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                      >
                        Reject Offer
                      </button>
                    </div>
                  </div>
                )}

                {offerAccepted && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 text-xs text-emerald-800 dark:border-emerald-950 dark:text-emerald-400">
                    <p className="font-bold">✓ Offer Accepted (₹{offerAccepted.ctc_offered} LPA package) - You are hired! 🎉</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
