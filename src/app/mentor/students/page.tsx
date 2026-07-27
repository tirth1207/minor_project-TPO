"use client"

import * as React from "react"
import { useMentor } from "../mentor-context"
import {
  IconUsers,
  IconUserCheck,
  IconSchool,
  IconBriefcase,
  IconExternalLink,
  IconCheck,
  IconX
} from "@tabler/icons-react"

export default function MentorStudentsPage() {
  const {
    students,
    selectedStudentId,
    setSelectedStudentId,
    handleUpdateStudentStatus,
  } = useMentor()

  // Get currently selected student details
  const selectedStudent = students.find(s => s.id === selectedStudentId)

  return (
    <div className="grid gap-6 md:grid-cols-3 items-start flex-1">

      {/* LEFT COLUMN: Student Directory List */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background flex flex-col gap-4 h-full min-h-[500px]">
        <h3 className="text-md font-bold flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-900">
          <IconUsers className="h-4.5 w-4.5 text-zinc-400" /> Department Student Directory
        </h3>

        {students.length === 0 ? (
          <p className="text-sm text-zinc-400 py-12 text-center">No students found matching filters.</p>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
            {students.map(student => {
              const isSelected = selectedStudentId === student.id
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-950 border-zinc-950 text-zinc-55 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950'
                      : 'border-zinc-150 hover:bg-zinc-50/70 text-zinc-650 dark:border-zinc-850 dark:hover:bg-zinc-900/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-extrabold text-sm truncate">{student.name}</span>
                    <span className="font-mono text-[10px] opacity-75">{student.enrollment_no}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs w-full opacity-90 font-medium">
                    <span>Sem {student.semester} • {student.branch}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      student.profile_status === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : student.profile_status === "PENDING"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}>
                      {student.profile_status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Detail Verification Inspection Panel */}
      <div className="md:col-span-2 rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background min-h-[500px]">
        {!selectedStudent ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-zinc-400">
            <IconUserCheck className="h-12 w-12 stroke-[1.2]" />
            <p className="text-sm font-semibold">Select a candidate from the directory to inspect</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Candidate header card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-zinc-100 dark:border-zinc-900">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{selectedStudent.name}</h2>
                <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                  Enrollment No: <span className="font-mono text-zinc-600 dark:text-zinc-300">{selectedStudent.enrollment_no}</span>
                  {selectedStudent.phone && ` • Phone: ${selectedStudent.phone}`}
                </p>
              </div>

              {/* Top status state indicator */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-400 font-semibold">Verification State:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                  selectedStudent.profile_status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : selectedStudent.profile_status === "PENDING"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {selectedStudent.profile_status}
                </span>
              </div>
            </div>

            {/* Profile Fields Sections */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <IconSchool className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Academic Track</h4>
                  <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    Branch: <span className="font-semibold">{selectedStudent.branch}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Semester {selectedStudent.semester}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconBriefcase className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Academic Metrics</h4>
                  <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    Cumulative CGPA: <span className="font-black text-primary text-base">{selectedStudent.cgpa}</span>
                  </p>
                  <p className="text-xs text-rose-500 font-semibold mt-0.5">
                    Active Backlogs: {selectedStudent.active_backlogs}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Candidate Bio</h4>
                <div className="p-3.5 rounded-xl border border-zinc-150 bg-zinc-50/40 text-sm leading-relaxed text-zinc-700 dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
                  {selectedStudent.bio || <span className="text-zinc-400 italic">No candidate bio provided yet.</span>}
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Academic Documentation</h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={selectedStudent.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto h-10 px-4 rounded-lg border border-secondary text-xs font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 dark:border-zinc-850 dark:text-zinc-300 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    Inspect Candidate Resume <IconExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Action Panel Buttons */}
            <div className="border-t pt-5 border-zinc-100 dark:border-zinc-900 mt-4 flex items-center justify-between gap-4">
              <div>
                {selectedStudent.is_placed ? (
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                    Placed Candidate 🎉
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400 font-semibold">Unplaced Candidate</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStudentStatus(selectedStudent.id, "APPROVED")}
                  disabled={selectedStudent.profile_status === "APPROVED"}
                  className="h-9 px-4.5 rounded-lg bg-emerald-600 text-zinc-50 text-xs font-semibold hover:bg-emerald-500 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconCheck className="h-4 w-4" /> Approve Profile
                </button>
                <button
                  onClick={() => handleUpdateStudentStatus(selectedStudent.id, "REJECTED")}
                  disabled={selectedStudent.profile_status === "REJECTED"}
                  className="h-9 px-4.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconX className="h-4 w-4" /> Reject Profile
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  )
}
