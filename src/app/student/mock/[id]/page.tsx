"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft, IconFileText } from "@tabler/icons-react";

import { useStudent } from "../../student-context";

type Question = {
  question?: string;
  text?: string;
  id?: string;
};

type Answer = {
  answer?: string;
  text?: string;
  score?: number;
  feedback?: string;
  questionId?: string;
};

type AIResult = {
  question?: string;
  question_id?: string;
  score?: number;
  feedback?: string;
  answer?: string;
};

type MockInterview = {
  id: string;
  student_id: string;
  job_role_context: string;
  questions: Question[] | string[];
  answers: Answer[] | string[];
  ai_score: number | null;
  ai_feedback: string | null;
  overall_score: number | null;
  ai_summary: string | null;
  ai_results: AIResult[] | Record<string, unknown> | null;
  completed_at: string | null;
  status: string;
  retry_count: number;
};

function getQuestionText(question: Question | string) {
  if (typeof question === "string") return question;
  return question.question || question.text || "Untitled question";
}

function getAnswerText(answer: Answer | string | undefined) {
  if (!answer) return "No answer provided";
  if (typeof answer === "string") return answer;
  return answer.answer || answer.text || "No answer provided";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Needs improvement";
  return "Needs work";
}

function getScoreClass(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-destructive";
}

function formatDate(date: string | null) {
  if (!date) return "Not completed";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeResults(results: MockInterview["ai_results"]): AIResult[] {
  if (!results) return [];
  if (Array.isArray(results)) return results;

  if (typeof results === "object") {
    const possibleResults =
      (results as any).results ||
      (results as any).questions ||
      (results as any).evaluations;

    if (Array.isArray(possibleResults)) return possibleResults;
  }

  return [];
}

export default function InterviewScorePage() {
  const params = useParams();
  const router = useRouter();
  const { mocks } = useStudent();

  const [mock, setMock] = useState<MockInterview | null>(null);
  const id = params?.id as string;

  useEffect(() => {
    if (!id || !mocks) return;
    const found = mocks.find((item: MockInterview) => item.id === id);
    if (found) setMock(found);
  }, [id, mocks]);

  const results = useMemo(
    () => normalizeResults(mock?.ai_results ?? null),
    [mock]
  );

  if (!mock) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <IconFileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <h1 className="text-base font-medium text-foreground">
            Interview not found
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We couldn&apos;t find this interview evaluation.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const overallScore = mock.overall_score ?? mock.ai_score ?? 0;
  const questions = Array.isArray(mock.questions) ? mock.questions : [];
  const answers = Array.isArray(mock.answers) ? mock.answers : [];

  const answeredCount = answers.filter((answer) => {
    const text = getAnswerText(answer);
    return text && text !== "No answer provided";
  }).length;

  const scoreLabel = getScoreLabel(overallScore);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconArrowLeft className="h-4 w-4" />
            Interviews
          </button>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                mock.status === "COMPLETED" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {mock.status}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Title + score */}
        <section className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AI interview evaluation
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {mock.job_role_context}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {formatDate(mock.completed_at)} · {answeredCount} of{" "}
              {questions.length} answered · attempt {mock.retry_count + 1}
            </p>
          </div>

          <div className="shrink-0">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-5xl font-semibold tracking-tight ${getScoreClass(
                  overallScore
                )}`}
              >
                {overallScore}
              </span>
              <span className="text-base text-muted-foreground">/ 100</span>
            </div>
            <p className={`mt-1 text-sm font-medium ${getScoreClass(overallScore)}`}>
              {scoreLabel}
            </p>
          </div>
        </section>

        {/* AI Summary / Feedback */}
        {(mock.ai_summary || mock.ai_feedback) && (
          <section className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mock.ai_summary || "No AI summary is available yet."}
              </p>
            </div>

            <div>
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Feedback
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mock.ai_feedback || "No detailed feedback is available yet."}
              </p>
            </div>
          </section>
        )}

        {/* Questions */}
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question-by-question
          </h2>

          <div className="mt-4 divide-y divide-border">
            {questions.map((question, index) => {
              const answer = answers[index];
              const result = results[index];
              const answerText = getAnswerText(answer);

              const questionScore =
                result?.score ??
                (typeof answer === "object" && answer !== null
                  ? answer.score
                  : undefined);

              const questionFeedback =
                result?.feedback ??
                (typeof answer === "object" && answer !== null
                  ? answer.feedback
                  : undefined);

              return (
                <div key={index} className="py-6 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium leading-6">
                      <span className="text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {getQuestionText(question)}
                    </p>

                    {questionScore !== undefined && (
                      <span
                        className={`shrink-0 text-sm font-semibold ${getScoreClass(
                          questionScore
                        )}`}
                      >
                        {questionScore}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-4 pl-0 sm:pl-7">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your answer
                      </p>
                      <p
                        className={`mt-1.5 text-sm leading-6 ${
                          answerText === "No answer provided"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {answerText}
                      </p>
                    </div>

                    <div className="border-l-2 border-border pl-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        AI evaluation
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {questionFeedback ||
                          "No question-level feedback available."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <section className="mt-10 flex items-center justify-between border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">
            Use this evaluation to prepare for your next interview.
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Back to interviews
          </button>
        </section>
      </main>
    </div>
  );
}