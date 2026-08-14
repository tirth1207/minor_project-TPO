"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconAward,
  IconBrain,
  IconCheck,
  IconClock,
  IconFileText,
  IconMessage,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";

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
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Needs Improvement";
  return "Needs Work";
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return "text-emerald-500";
  }

  if (score >= 60) {
    return "text-amber-500";
  }

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

function normalizeResults(
  results: MockInterview["ai_results"]
): AIResult[] {
  if (!results) return [];

  if (Array.isArray(results)) {
    return results;
  }

  if (typeof results === "object") {
    const possibleResults =
      (results as any).results ||
      (results as any).questions ||
      (results as any).evaluations;

    if (Array.isArray(possibleResults)) {
      return possibleResults;
    }
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

    const found = mocks.find(
      (item: MockInterview) => item.id === id
    );

    if (found) {
      setMock(found);
    }
  }, [id, mocks]);

  const results = useMemo(
    () => normalizeResults(mock?.ai_results ?? null),
    [mock]
  );

  if (!mock) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <IconFileText className="h-5 w-5 text-muted-foreground" />
          </div>

          <h1 className="text-lg font-semibold text-foreground">
            Interview not found
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find this interview evaluation.
          </p>

          <button
            onClick={() => router.back()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <IconArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const overallScore =
    mock.overall_score ?? mock.ai_score ?? 0;

  const questions = Array.isArray(mock.questions)
    ? mock.questions
    : [];

  const answers = Array.isArray(mock.answers)
    ? mock.answers
    : [];

  const answeredCount = answers.filter((answer) => {
    const text = getAnswerText(answer);

    return (
      text &&
      text !== "No answer provided"
    );
  }).length;

  const scoreLabel = getScoreLabel(overallScore);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <IconArrowLeft className="h-4 w-4" />
            </span>

            <span className="hidden sm:inline">
              Back to Interviews
            </span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                mock.status === "COMPLETED"
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
            />

            <span className="text-xs font-medium text-muted-foreground">
              {mock.status}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-10">
        {/* Hero */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <IconSparkles className="h-3.5 w-3.5 text-primary" />
                AI Interview Evaluation
              </div>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {mock.job_role_context}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Review your interview performance, AI evaluation,
                and personalized feedback.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <MetaItem
                  icon={<IconClock className="h-3.5 w-3.5" />}
                  text={formatDate(mock.completed_at)}
                />

                <MetaItem
                  icon={<IconMessage className="h-3.5 w-3.5" />}
                  text={`${questions.length} Questions`}
                />

                <MetaItem
                  icon={<IconCheck className="h-3.5 w-3.5" />}
                  text={`${answeredCount} Answered`}
                />
              </div>
            </div>

            {/* Score */}
            <div className="flex shrink-0 justify-center">
              <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-8 border-secondary">
                <span
                  className={`text-4xl font-bold tracking-tight ${getScoreClass(
                    overallScore
                  )}`}
                >
                  {overallScore}
                </span>

                <span className="text-xs text-muted-foreground">
                  / 100
                </span>

                <span
                  className={`mt-1 text-xs font-medium ${getScoreClass(
                    overallScore
                  )}`}
                >
                  {scoreLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<IconAward />}
            label="Overall"
            value={`${overallScore}`}
            description={scoreLabel}
          />

          <StatCard
            icon={<IconBrain />}
            label="AI Score"
            value={
              mock.ai_score !== null
                ? `${mock.ai_score}`
                : "—"
            }
            description="AI evaluation"
          />

          <StatCard
            icon={<IconTarget />}
            label="Questions"
            value={`${questions.length}`}
            description={`${answeredCount} answered`}
          />

          <StatCard
            icon={<IconTrendingUp />}
            label="Attempts"
            value={`${mock.retry_count + 1}`}
            description="Total attempts"
          />
        </section>

        {/* AI Summary */}
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <InfoCard
            icon={<IconSparkles />}
            title="AI Summary"
            description="Overall assessment"
          >
            <p className="text-sm leading-6 text-muted-foreground">
              {mock.ai_summary ||
                "No AI summary is available yet."}
            </p>
          </InfoCard>

          <InfoCard
            icon={<IconBrain />}
            title="AI Feedback"
            description="Areas to improve"
          >
            <p className="text-sm leading-6 text-muted-foreground">
              {mock.ai_feedback ||
                "No detailed feedback is available yet."}
            </p>
          </InfoCard>
        </section>

        {/* Performance */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Interview Performance
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Question-by-question evaluation.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {questions.map((question, index) => {
              const answer = answers[index];
              const result = results[index];

              const answerText = getAnswerText(answer);

              const questionScore =
                result?.score ??
                (typeof answer === "object" &&
                answer !== null
                  ? answer.score
                  : undefined);

              const questionFeedback =
                result?.feedback ??
                (typeof answer === "object" &&
                answer !== null
                  ? answer.feedback
                  : undefined);

              return (
                <div
                  key={index}
                  className="border-b border-border last:border-b-0"
                >
                  {/* Question */}
                  <div className="flex items-start justify-between gap-4 bg-secondary/50 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                        {index + 1}
                      </span>

                      <p className="text-sm font-medium leading-6">
                        {getQuestionText(question)}
                      </p>
                    </div>

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

                  {/* Answer / Evaluation */}
                  <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                    <div className="p-5 sm:p-6">
                      <div className="mb-2 flex items-center gap-2">
                        <IconMessage className="h-4 w-4 text-muted-foreground" />

                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Your Answer
                        </span>
                      </div>

                      <p
                        className={`text-sm leading-6 ${
                          answerText === "No answer provided"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {answerText}
                      </p>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="mb-2 flex items-center gap-2">
                        {questionScore !== undefined &&
                        questionScore >= 60 ? (
                          <IconCheck className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <IconX className="h-4 w-4 text-amber-500" />
                        )}

                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          AI Evaluation
                        </span>
                      </div>

                      <p className="text-sm leading-6 text-muted-foreground">
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

        {/* Footer CTA */}
        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Keep improving.
            </h2>

            <p className="mt-1 text-sm opacity-70">
              Use this evaluation to prepare for your next interview.
            </p>
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Interviews
          </button>
        </section>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function MetaItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
      {icon}
      {text}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {React.cloneElement(
          icon as React.ReactElement,
          {
            className: "h-4 w-4",
          }
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-0.5 text-xl font-semibold">
        {value}
      </p>

      <p className="mt-0.5 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
          {React.cloneElement(
            icon as React.ReactElement,
            {
              className: "h-4 w-4",
            }
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold">
            {title}
          </h3>

          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}