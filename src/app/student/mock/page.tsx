"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import { IconRobot, IconExclamationCircle, IconAward } from "@tabler/icons-react"
import Link from "next/link"

export default function StudentMockPage() {
  const {
    mocks,
    targetRole,
    setTargetRole,
    activeMock,
    setActiveMock,
    mockAnswers,
    setMockAnswers,
    scoringMock,
    handleStartMock,
    handleCompleteMock,
  } = useStudent()
  console.log("Rendering StudentMockPage with activeMock:", activeMock)
  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">

      {/* Left: start mock form & metrics */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background flex flex-col gap-4">
        <h3 className="text-md font-bold flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-900">
          <IconRobot className="h-4.5 w-4.5 text-zinc-400" /> Spawn Mock Prep
        </h3>

        {!activeMock ? (
          <form onSubmit={e => { e.preventDefault(); handleStartMock(); }} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Job Role Context *</label>
              <input
                type="text"
                placeholder="e.g. Frontend Engineer"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900"
                required
              />
            </div>
            <button
              type="submit"
              disabled={scoringMock || !targetRole.trim()}
              className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
            >
              {scoringMock ? "Seeding Interview..." : "Start AI Mock Prep"}
            </button>
          </form>
        ) : (
          <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-xs text-amber-800 dark:bg-amber-950/15 dark:border-amber-950 dark:text-amber-400">
            <p className="font-bold flex items-center gap-1"><IconExclamationCircle className="h-4 w-4" /> Mock Prep Active</p>
            <p className="mt-0.5">Please provide your technical answers in the workspace details panel on the right. Scoring takes 3-5 seconds.</p>
          </div>
        )}

        {/* Historical mock scores list */}
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historical Scores Roster</h4>
          {mocks.length === 0 ? (
            <p className="text-[10px] text-zinc-400 italic">No mock records yet.</p>
          ) : (
            mocks.map(m => (
              <div key={m.id} className="p-2.5 border rounded-lg flex items-center justify-between text-xs dark:border-secondary">
                <Link href={`/student/mock/${m.id}`} className="block w-full">
                  <div className="truncate max-w-[140px]">
                    <p className="font-bold truncate text-zinc-800 dark:text-zinc-200">{m.job_role_context}</p>
                    <p className="text-[9px] text-zinc-400 capitalize">{m.status.toLowerCase()}</p>
                  </div>
                </Link>
                {m.ai_score !== null && (
                  <span className="font-black text-sm text-primary">{m.ai_score}%</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: active mock workspace */}
      <div className="md:col-span-2 rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background min-h-[400px]">
        {!activeMock ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
            <IconRobot className="h-12 w-12 stroke-[1.2]" />
            <p className="text-sm font-semibold">Ready to prep? Initiate an AI mock prep workspace to the left</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="border-b pb-3 border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">AI Mock Workspace: {activeMock.job_role_context}</h4>
                <p className="text-[10px] text-zinc-400">Provide structured technical explanations for each generated question.</p>
              </div>
              <button
                onClick={() => setActiveMock(null)}
                className="text-xs text-zinc-400 hover:text-zinc-900 underline"
              >
                Reset Workspace
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {activeMock.questions.map((q, index) => (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Question {index + 1}: <span className="font-semibold">{q.text}</span>
                  </label>
                  <textarea
                    value={mockAnswers[index] || ""}
                    onChange={e => {
                      const updated = [...mockAnswers]
                      updated[index] = e.target.value
                      setMockAnswers(updated)
                    }}
                    rows={3}
                    placeholder="Write your comprehensive technical explanation here..."
                    className="w-full rounded-lg border border-secondary p-2.5 text-xs focus:outline-primary dark:border-secondary dark:bg-zinc-900"
                  />
                </div>
              ))}
            </div>

            <div className="border-t pt-4 border-zinc-100 dark:border-zinc-900 text-right">
              <button
                onClick={handleCompleteMock}
                disabled={scoringMock || mockAnswers.some(ans => !ans.trim())}
                className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
              >
                {scoringMock ? "Simulating AI Assessment..." : "Submit Answers & Score Interview"}
              </button>
            </div>
          </div>
        )}

        {/* AI Feedback critique view if latest is COMPLETED */}
        {!activeMock && mocks.length > 0 && mocks[0].status === "COMPLETED" && (
          <div className="mt-6 border-t pt-5 border-zinc-100 dark:border-zinc-900">
            <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 mb-2">
              <IconAward className="h-5 w-5 text-zinc-400" /> Latest AI Performance Assessment Report
            </h4>
            <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/40 text-xs leading-relaxed font-sans whitespace-pre-wrap dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
              {mocks[0].ai_feedback}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
