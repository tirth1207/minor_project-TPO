"use client"

import * as React from "react"
import { toast } from "@/components/ui/toast"
import { useStudent } from "../student-context"
import { IconRobot, IconExclamationCircle, IconAward } from "@tabler/icons-react"
import Link from "next/link"

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

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

  console.log(
    "Rendering StudentMockPage with activeMock:",
    activeMock
  )

  /**
   * Get status badge text and class for the active mock status.
   */
  function getStatusInfo(status: string | null) {
    switch (status) {
      case "REQUESTED":
        return { text: "Preparing...", class: "bg-zinc-100 text-zinc-800" }
      case "QUEUED":
        return { text: "Waiting for AI...", class: "bg-amber-100 text-amber-800" }
      case "PROCESSING":
        return { text: "Generating questions...", class: "bg-blue-100 text-blue-800" }
      case "ANSWERING":
        return { text: "Ready to answer", class: "bg-green-100 text-green-800" }
      case "EVALUATING":
        return { text: "AI evaluating", class: "bg-amber-100 text-amber-800" }
      case "EVALUATED":
        return { text: "Evaluated", class: "bg-emerald-100 text-emerald-800" }
      case "FAILED":
        return { text: "Failed", class: "bg-destructive text-white" }
      default:
        return { text: status || "Unknown", class: "bg-zinc-100 text-zinc-800" }
    }
  }

  /**
   * Convert questionnaire FormData into the existing
   * mockAnswers array used by the student context.
   */
  function handleQuestionnaireSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const answers =
      activeMock?.questions.map((_, index) => {
        return String(formData.get(`answer-${index}`) ?? "")
      }) ?? []

    const hasEmptyAnswer = answers.some(
      (answer) => !answer.trim()
    )

    if (hasEmptyAnswer) {
      toast.error("Please answer every question before submitting.")
      return
    }

    setMockAnswers(answers)

    /**
     * Pass answers to handleCompleteMock via override.
     * The context function uses answersOverride ?? mockAnswers.
     */
    handleCompleteMock(answers)
  }

  /**
   * Render the mock control bar based on activeMock status.
   */
  function renderMockControlBar() {
    if (!activeMock) {
      return null
    }

    const { text, class: badgeClass } = getStatusInfo(activeMock.status)

    return (
      <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: activeMock.status === "FAILED" ? "var(--destructive)" : activeMock.status === "EVALUATED" ? "var(--emerald)" : "var(--secondary)" }}>
        <span className={`font-medium text-sm ${badgeClass}`}>{text}</span>
      </div>
    )
  }

  /**
   * Render AI feedback for completed/ evaluated mocks.
   */
  function renderAIFeedback() {
    if (!activeMock) return null

    const isEvaluated =
      activeMock.status === "EVALUATED" ||
      (activeMock.ai_score !== null && activeMock.overall_score !== null)

    if (!isEvaluated) return null

    return (
      <div className="mt-6 border-t pt-5 border-zinc-100 dark:border-zinc-900">
        <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 mb-2">
          <IconAward className="h-5 w-5 text-zinc-400" />
          Latest AI Performance Assessment Report
        </h4>

        <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/40 text-xs leading-relaxed font-sans whitespace-pre-wrap dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
          {activeMock.ai_summary || activeMock.ai_feedback || "No feedback available."}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 items-start">
      {/* ============================================================
          LEFT: START MOCK + HISTORICAL
      ============================================================ */}
      <div className="rounded-2xl border border-secondary bg-background p-5 dark:border-secondary dark:bg-background flex flex-col gap-4">
        <h3 className="text-md font-bold flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-900">
          <IconRobot className="h-4.5 w-4.5 text-zinc-400" />
          Spawn Mock Prep
        </h3>

        {!activeMock ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleStartMock()
            }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Target Job Role Context *
              </label>

              <input
                type="text"
                placeholder="e.g. Frontend Engineer"
                value={targetRole}
                onChange={(e) =>
                  setTargetRole(e.target.value)
                }
                className="w-full h-9 rounded-lg border border-secondary px-3 text-sm focus:outline-primary dark:border-secondary dark:bg-zinc-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={
                scoringMock ||
                !targetRole.trim()
              }
              className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
            >
              {scoringMock
                ? "Seeding Interview..."
                : "Start AI Mock Prep"}
            </button>
          </form>
        ) : (
          renderMockControlBar()
        )}

        {/* ============================================================
            HISTORICAL SCORES
        ============================================================ */}
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Historical Scores Roster
          </h4>

          {mocks.length === 0 ? (
            <p className="text-[10px] text-zinc-400 italic">
              No mock records yet.
            </p>
          ) : (
            mocks.map((m) => (
              <div
                key={m.id}
                className="p-2.5 border rounded-lg flex items-center justify-between text-xs dark:border-secondary"
              >
                <Link
                  href={`/student/mock/${m.id}`}
                  className="block w-full"
                >
                  <div className="truncate max-w-[140px]">
                    <p className="font-bold truncate text-zinc-800 dark:text-zinc-200">
                      {m.job_role_context}
                    </p>

                    <p className="text-[9px] text-zinc-400 capitalize">
                      {m.status.toLowerCase()}
                    </p>
                  </div>
                </Link>

                {m.overall_score !== null && (
                  <span className="font-black text-sm text-primary">
                    {m.overall_score}%
                  </span>
                )}

                {m.ai_score !== null && (
                  <span className="font-text text-sm text-secondary">
                    {m.ai_score}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================
          RIGHT: MOCK WORKSPACE
      ============================================================ */}
      <div className="md:col-span-2 rounded-2xl border border-secondary bg-background p-6 dark:border-secondary dark:bg-background min-h-[400px]">
        {!activeMock ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
            <IconRobot className="h-12 w-12 stroke-[1.2]" />

            <p className="text-sm font-semibold">
              Ready to prep? Initiate an AI mock prep
              workspace to the left
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* ======================================================
                HEADER
            ====================================================== */}
            <div className="border-b pb-3 border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                  AI Mock Workspace:{" "}
                  {activeMock.job_role_context}
                </h4>

                <p className="text-[10px] text-zinc-400">
                  {getStatusInfo(activeMock.status).text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveMock(null)
                  setMockAnswers([])
                }}
                className="text-xs text-zinc-400 hover:text-zinc-900 underline"
              >
                Reset Workspace
              </button>
            </div>

            {/* ======================================================
                QUESTIONNAIRE
            ====================================================== */}
            {activeMock.status === "ANSWERING" && (
              <Questionnaire
                key={activeMock.id}
                className="w-full"
                defaultItem={`answer-0`}
                items={activeMock.questions.map((question, index) => ({
                  name: `answer-${index}`,
                  title: `Question ${index + 1}`,
                  description: question.text,
                  required: true,
                }))}
                shortcuts="letters"
                onSubmit={handleQuestionnaireSubmit}
              >
                <QuestionnaireProgress />

                {activeMock.questions.map((question, index) => (
                  <QuestionnaireItem
                    key={question.id}
                    name={`answer-${index}`}
                    required
                  >
                    <QuestionnaireTitle>
                      Question {index + 1}
                    </QuestionnaireTitle>

                    <QuestionnaireDescription>
                      {question.text}
                    </QuestionnaireDescription>

                    <QuestionnaireInput
                      aria-label={`Answer to question ${index + 1}`}
                      placeholder="Write your comprehensive technical explanation here..."
                    />

                    <QuestionnaireError />
                  </QuestionnaireItem>
                ))}

                <QuestionnaireActions>
                  <QuestionnairePrevious />

                  <QuestionnaireSkip />

                  <QuestionnaireNext>
                    Next Question
                  </QuestionnaireNext>

                  <QuestionnaireSubmit>
                    {scoringMock
                      ? "Simulating AI Assessment..."
                      : "Submit & Score Interview"}
                  </QuestionnaireSubmit>
                </QuestionnaireActions>
              </Questionnaire>
            )}

            {activeMock.status === "EVALUATING" && (
              <div className="mt-6 p-4 rounded-lg bg-amber-50/30 border border-amber-100">
                <p className="text-sm text-amber-800">
                  AI is evaluating your answers...
                </p>
              </div>
            )}

            {activeMock.status === "EVALUATED" && (
              <div className="mt-6 border-t pt-5 border-zinc-100 dark:border-zinc-900">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 mb-2">
                  <IconAward className="h-5 w-5 text-zinc-400" />

                  AI Evaluation Results
                </h4>

                <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/40 text-xs leading-relaxed font-sans whitespace-pre-wrap dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
                  <p className="font-bold text-lg text-primary">
                    {activeMock.overall_score}%
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {activeMock.ai_summary || "No summary available."}
                  </p>
                </div>
              </div>
            )}

            {activeMock.status === "FAILED" && (
              <div className="mt-6 p-4 rounded-lg bg-destructive/20 border border-destructive">
                <p className="text-sm text-destructive">
                  Your mock interview failed to process. Please try creating a new mock interview.
                </p>
              </div>
            )}

            {/* ============================================================
                AI FEEDBACK
            ============================================================ */}
            {!activeMock &&
              mocks.length > 0 &&
              (mocks[0].status === "EVALUATED" ||
                (mocks[0].ai_score !== null && mocks[0].overall_score !== null)) && (
              <div className="mt-6 border-t pt-5 border-zinc-100 dark:border-zinc-900">
                <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 mb-2">
                  <IconAward className="h-5 w-5 text-zinc-400" />

                  Latest AI Performance Assessment Report
                </h4>

                <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/40 text-xs leading-relaxed font-sans whitespace-pre-wrap dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
                  {mocks[0].ai_feedback || mocks[0].ai_summary || "No feedback available."}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}