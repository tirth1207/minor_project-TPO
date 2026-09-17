"use client";

import * as React from "react";

import { StudentCareerOnboardingDialog } from "@/components/student/career-onboarding-dialog";
import { createClient } from "@/lib/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBrain,
  IconBriefcase,
  IconBook,
  IconCheck,
  IconRefresh,
  IconSparkles,
  IconTarget,
  IconPlaneDeparture,
  IconCircleCheck,
} from "@tabler/icons-react";

import type { CareerRoadmapData } from "@/types/career";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface RoadmapApiResponse {
  success?: boolean;
  data?: {
    roadmap?: CareerRoadmapData;
    onboardingRequired?: boolean;
  };
  roadmap?: CareerRoadmapData;
  onboardingRequired?: boolean;
  error?: string;
}

/* -------------------------------------------------------------------------- */
/* Local roadmap cache                                                        */
/* -------------------------------------------------------------------------- */

const ROADMAP_CACHE_VERSION = 1;
const ROADMAP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const ROADMAP_CACHE_PREFIX = "tpo:student-career-roadmap";

interface RoadmapCacheEntry {
  version: number;
  userId: string;
  savedAt: number;
  roadmap: CareerRoadmapData;
}

function getRoadmapCacheKey(userId: string) {
  return `${ROADMAP_CACHE_PREFIX}:${userId}`;
}

function readRoadmapCache(userId: string): RoadmapCacheEntry | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(getRoadmapCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RoadmapCacheEntry;

    if (
      parsed?.version !== ROADMAP_CACHE_VERSION ||
      parsed?.userId !== userId ||
      !parsed?.savedAt ||
      !parsed?.roadmap
    ) {
      window.localStorage.removeItem(getRoadmapCacheKey(userId));
      return null;
    }

    if (Date.now() - parsed.savedAt > ROADMAP_CACHE_TTL_MS) {
      window.localStorage.removeItem(getRoadmapCacheKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeRoadmapCache(userId: string, roadmap: CareerRoadmapData) {
  if (typeof window === "undefined" || !userId) return;

  try {
    const entry: RoadmapCacheEntry = {
      version: ROADMAP_CACHE_VERSION,
      userId,
      savedAt: Date.now(),
      roadmap,
    };

    window.localStorage.setItem(
      getRoadmapCacheKey(userId),
      JSON.stringify(entry),
    );
  } catch {
    // localStorage can be unavailable/full; the server remains the source of truth.
  }
}

function clearRoadmapCache(userId: string) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.removeItem(getRoadmapCacheKey(userId));
  } catch {
    // Ignore storage errors.
  }
}

function formatCacheAge(savedAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - savedAt) / 60000));

  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `Saved ${hours}h ago`;
}

function getNextRoadmapAction(roadmap: CareerRoadmapData) {
  const highPriorityGap = Array.isArray(roadmap?.skillGaps)
    ? roadmap.skillGaps.find((gap) => gap?.priority === "HIGH")
    : null;

  if (highPriorityGap) {
    return {
      eyebrow: "Highest-impact next step",
      title: `Improve ${highPriorityGap.skill}`,
      description:
        highPriorityGap.reason ||
        "This is currently the highest-priority skill gap in your roadmap.",
      href: "#skill-gaps",
      action: "View skill gap",
    };
  }

  const firstPhase = Array.isArray(roadmap?.learningPlan)
    ? roadmap.learningPlan[0]
    : null;

  if (firstPhase) {
    return {
      eyebrow: "Start here",
      title: firstPhase.phase,
      description:
        "Start with the first phase and work through the plan in order.",
      href: "#learning-roadmap",
      action: "Start learning",
    };
  }

  return {
    eyebrow: "Your next move",
    title: "Complete a mock interview",
    description:
      "A completed mock interview gives your roadmap better performance data.",
    href: "/student/mock",
    action: "Take a mock",
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeRoadmap(
  payload: RoadmapApiResponse,
): CareerRoadmapData | null {
  const data = payload?.data;

  if (data?.roadmap) {
    return data.roadmap;
  }

  if (payload?.roadmap) {
    return payload.roadmap;
  }

  if (payload && "readiness" in payload && "careerGoal" in payload) {
    return payload as unknown as CareerRoadmapData;
  }

  return null;
}

function getReadinessTier(score: number) {
  if (score >= 85) {
    return {
      label: "Excellent",
      stroke: "#10b981",
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
    };
  }

  if (score >= 70) {
    return {
      label: "Strong",
      stroke: "#3b82f6",
      badge:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400",
    };
  }

  if (score >= 50) {
    return {
      label: "Developing",
      stroke: "#f59e0b",
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    };
  }

  return {
    label: "Needs Improvement",
    stroke: "#f43f5e",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400",
  };
}

function getPriorityClass(priority?: string) {
  switch (priority) {
    case "HIGH":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400";
    case "LOW":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-400";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";
  }
}

function getMatchBorderClass(score?: number) {
  const s = score ?? 0;
  if (s >= 80) return "border-l-emerald-500";
  if (s >= 60) return "border-l-blue-500";
  return "border-l-amber-500";
}

function ReadinessGauge({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;
  const tier = getReadinessTier(clamped);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tier.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-white">
          {clamped}%
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Ready
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentCareerRoadmapPage() {
  const [roadmap, setRoadmap] = React.useState<CareerRoadmapData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [cachedAt, setCachedAt] = React.useState<number | null>(null);
  const inFlightRef = React.useRef<Promise<void> | null>(null);

  const getUserId = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id || null;
    } catch {
      return null;
    }
  }, []);

  const fetchRoadmap = React.useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;

      if (inFlightRef.current && !force) {
        return inFlightRef.current;
      }

      const request = (async () => {
        setLoading(true);
        setError(null);

        const userId = await getUserId();

        if (!force && userId) {
          const cached = readRoadmapCache(userId);

          if (cached) {
            setRoadmap(cached.roadmap);
            setCachedAt(cached.savedAt);
            setLoading(false);
            return;
          }
        }

        try {
          const response = await fetch("/api/students/career-roadmap", {
            method: "GET",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
          });

          const json: RoadmapApiResponse = await response.json();

          if (!response.ok) {
            setError(json?.error || "Failed to load your career roadmap.");
            return;
          }

          const payload = json?.data || json;

          if (payload?.onboardingRequired) {
            if (userId) clearRoadmapCache(userId);
            setRoadmap(null);
            setCachedAt(null);
            setOnboardingOpen(true);
            return;
          }

          const normalizedRoadmap = normalizeRoadmap(json);

          if (!normalizedRoadmap) {
            setRoadmap(null);
            setCachedAt(null);
            setError("Career roadmap data was not returned by the server.");
            return;
          }

          setRoadmap(normalizedRoadmap);

          if (userId) {
            writeRoadmapCache(userId, normalizedRoadmap);
            setCachedAt(Date.now());
          }
        } catch (err: any) {
          setError(err?.message || "An unexpected network error occurred.");
        } finally {
          setLoading(false);
        }
      })();

      inFlightRef.current = request;

      try {
        await request;
      } finally {
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
      }
    },
    [getUserId],
  );

  React.useEffect(() => {
    void fetchRoadmap();
  }, [fetchRoadmap]);

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    setError(null);

    const userId = await getUserId();

    try {
      const response = await fetch("/api/students/career-roadmap/refresh", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });

      const json: RoadmapApiResponse = await response.json();

      if (!response.ok) {
        setError(json?.error || "Failed to refresh your career roadmap.");
        return;
      }

      const normalizedRoadmap = normalizeRoadmap(json);

      if (!normalizedRoadmap) {
        setError(
          "The roadmap refreshed, but no data came back. Try again in a moment.",
        );
        return;
      }

      setRoadmap(normalizedRoadmap);

      if (userId) {
        writeRoadmapCache(userId, normalizedRoadmap);
        setCachedAt(Date.now());
      }
    } catch (err: any) {
      setError(err?.message || "Failed to refresh career roadmap.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-8" aria-busy="true">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <IconBrain className="h-3.5 w-3.5 animate-pulse" />
          Preparing your roadmap…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <StudentCareerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onCompleted={() => fetchRoadmap({ force: true })}
      />

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex min-w-0 items-start gap-3">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                Couldn&apos;t load your roadmap
              </p>
              <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-400">
                {error}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => fetchRoadmap()}
            >
              Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setOnboardingOpen(true)}
            >
              Edit Goals
            </Button>
          </div>
        </div>
      )}

      {!roadmap && !error && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md text-center">
            <IconBrain className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">
              Set your target to get a roadmap
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us the role and CTC you&apos;re aiming for, and we&apos;ll
              build a personalized plan from your skills and mock interview
              history.
            </p>
            <Button className="mt-5" onClick={() => setOnboardingOpen(true)}>
              Set Career Goals
            </Button>
          </div>
        </div>
      )}

      {roadmap && (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Student Portal
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Your career plan
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                See your readiness, focus on the biggest gaps, and move toward
                the right opportunities.
              </p>
            </div>
          </div>

          <div className="sticky top-2 z-30 -mx-1 overflow-x-auto px-1 pb-1">
            <nav
              aria-label="Roadmap sections"
              className="flex w-max min-w-full items-center gap-1 rounded-xl border bg-background/90 p-1 shadow-sm backdrop-blur"
            >
              {[
                ["#overview", "Overview"],
                ["#strengths", "Strengths"],
                ["#skill-gaps", "Skill gaps"],
                ["#learning-roadmap", "Learning"],
                ["#opportunities", "Opportunities"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <CareerRoadmap
            roadmap={roadmap}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEditGoals={() => setOnboardingOpen(true)}
            cachedAt={cachedAt}
          />
        </>
      )}
    </div>
  );
}

interface CareerRoadmapProps {
  roadmap: CareerRoadmapData;
  refreshing: boolean;
  onRefresh: () => void;
  onEditGoals: () => void;
  cachedAt?: number | null;
}

function CareerRoadmap({
  roadmap,
  refreshing,
  onRefresh,
  onEditGoals,
  cachedAt,
}: CareerRoadmapProps) {
  const readinessScore = Number(roadmap?.readiness?.score ?? 0);
  const readinessSummary =
    roadmap?.readiness?.summary || "No readiness analysis is available yet.";

  const careerGoal = roadmap?.careerGoal;
  const skillGaps = Array.isArray(roadmap?.skillGaps) ? roadmap.skillGaps : [];
  const strengths = Array.isArray(roadmap?.strengths) ? roadmap.strengths : [];
  const learningPlan = Array.isArray(roadmap?.learningPlan)
    ? roadmap.learningPlan
    : [];
  const recommendedJobs = Array.isArray(roadmap?.recommendedJobs)
    ? roadmap.recommendedJobs
    : [];

  const tier = getReadinessTier(readinessScore);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <section
        id="overview"
        className="relative scroll-mt-20 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-sm sm:p-7"
      >
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-300">
              <IconSparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Career Intelligence
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Career Roadmap
            </h2>
            <p className="mt-2 max-w-md text-xs leading-5 text-zinc-400">
              A personalized plan based on your current skills, career goals,
              learning gaps and active placement opportunities.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onEditGoals}
                className="h-8 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-900 hover:text-white"
              >
                Edit Goals
              </Button>
              <Button
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-8 gap-1.5 bg-white text-xs text-zinc-900 shadow-sm hover:bg-zinc-100"
                title="Generate a fresh roadmap with AI"
              >
                <IconRefresh
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Rebuilding..." : "Rebuild with AI"}
              </Button>
              {cachedAt && !refreshing && (
                <span className="hidden items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[10px] text-zinc-400 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {formatCacheAge(cachedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 border-t border-zinc-800 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <ReadinessGauge score={readinessScore} />
            <div className="max-w-[200px]">
              <Badge
                variant="outline"
                className={`text-[10px] ${tier.badge} border-opacity-100`}
              >
                {tier.label}
              </Badge>
              <p className="mt-2 text-[11px] leading-5 text-zinc-400">
                {readinessSummary}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl p-0 shadow-sm">
        <div className="flex flex-col sm:flex-row">
          <div className="flex items-center gap-4 p-5 sm:w-[46%]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <IconPlaneDeparture className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Dream Role</p>
              <p className="truncate text-sm font-semibold">
                {careerGoal?.dreamJob.split("(")[0] || "Career Goal"}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {careerGoal?.dreamRole.split("(")[1].split(")")[0] ||
                  "Set your target role"}
              </p>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 border-t sm:grid-cols-2 sm:border-l sm:border-t-0">
            <div className="p-5">
              <p className="text-[11px] text-muted-foreground">Target CTC</p>
              <p className="mt-1 text-sm font-semibold text-primary">
                ₹{Number(careerGoal?.targetCtc || 0).toLocaleString("en-IN")} PA
              </p>
            </div>
            <div className="border-l p-5">
              <p className="text-[11px] text-muted-foreground">Timeline</p>
              <p className="mt-1 text-sm font-semibold">
                {careerGoal?.targetTimeline || 0}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5">
        {(() => {
          const nextAction = getNextRoadmapAction(roadmap);
          return (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconTarget className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {nextAction.eyebrow}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold">
                    {nextAction.title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                    {nextAction.description}
                  </p>
                </div>
              </div>
              <a
                href={nextAction.href}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-medium shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {nextAction.action}
                <IconArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        })()}
      </div>

      <Card id="strengths" className="scroll-mt-20 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconCircleCheck className="h-4 w-4 text-primary" />
            Your Strengths
          </CardTitle>
          <CardDescription className="text-xs">
            Skills where your recent performance is already strong.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {strengths.map((strength, index) => (
            <div
              key={`${strength.skill}-${index}`}
              className="rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-semibold">{strength.skill}</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {strength.reason}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="skill-gaps" className="scroll-mt-20 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconBrain className="h-4 w-4 text-primary" />
            Skill Gap Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            The highest-impact skills to improve to reach your target.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skillGaps.map((gap, index) => (
            <div
              key={`${gap.skill}-${index}`}
              className="rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{gap.skill}</p>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${getPriorityClass(gap.priority)}`}
                >
                  {gap.priority}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px]">
                <span className="rounded-md bg-muted px-2 py-1">
                  {gap.currentLevel || "Current"}
                </span>
                <IconArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                  {gap.requiredLevel || "Target"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {gap.reason}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card
        id="learning-roadmap"
        className="scroll-mt-20 overflow-hidden rounded-2xl shadow-sm"
      >
        <CardHeader className="border-b bg-muted/20 pb-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <IconBook className="h-3.5 w-3.5 text-primary" />
                </span>
                Learning Roadmap
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-xs leading-5">
                Follow the phases in order. Each phase turns your skill gaps
                into focused learning and practical work.
              </CardDescription>
            </div>
            {learningPlan.length > 0 && (
              <div className="flex shrink-0 items-center gap-2 self-start rounded-lg border bg-background px-3 py-2 sm:self-auto">
                <div className="flex -space-x-1">
                  {learningPlan.slice(0, 5).map((_, index) => (
                    <span
                      key={index}
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-[8px] font-bold text-primary-foreground"
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {learningPlan.length}{" "}
                  {learningPlan.length === 1 ? "phase" : "phases"}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {learningPlan.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <IconBook className="mx-auto h-7 w-7 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">
                Your learning plan is not ready yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                Complete your career goals and mock interviews to generate a
                personalized learning path.
              </p>
            </div>
          ) : (
            <Accordion
              defaultValue={["phase-0"]}
              className="w-full overflow-hidden rounded-xl border"
            >
              {learningPlan.map((phase, index) => {
                const isFirst = index === 0;
                const topicCount = (phase.topics || []).length;
                const practiceCount = (phase.practiceTasks || []).length;
                return (
                  <AccordionItem
                    key={`${phase.phase}-${index}`}
                    value={`phase-${index}`}
                    className="border-b last:border-b-0"
                  >
                    <div
                      className={`overflow-hidden border-0 transition-all ${
                        isFirst
                          ? "bg-primary/[0.02]"
                          : "bg-background hover:bg-muted/20"
                      }`}
                    >
                      <AccordionTrigger className="px-4 py-4 hover:no-underline sm:px-5 sm:py-5">
                        <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isFirst ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                          >
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Phase {index + 1}
                              </span>
                              {isFirst && (
                                <Badge className="h-5 border-0 bg-primary/10 px-2 text-[9px] font-medium text-primary hover:bg-primary/10">
                                  Start here
                                </Badge>
                              )}
                            </div>
                            <h3 className="mt-1 truncate text-sm font-semibold tracking-tight">
                              {phase.phase}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="h-5 text-[9px]"
                              >
                                {phase.duration || "Flexible"}
                              </Badge>
                              {topicCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  {topicCount}{" "}
                                  {topicCount === 1 ? "topic" : "topics"}
                                </span>
                              )}
                              {practiceCount > 0 && (
                                <>
                                  <span className="text-muted-foreground/40">
                                    ·
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {practiceCount}{" "}
                                    {practiceCount === 1
                                      ? "practice task"
                                      : "practice tasks"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="hidden max-w-[180px] shrink-0 flex-wrap justify-end gap-1.5 md:flex">
                            {(phase.skills || [])
                              .slice(0, 3)
                              .map((skill, skillIndex) => (
                                <Badge
                                  key={`${skill}-${skillIndex}`}
                                  variant="secondary"
                                  className="max-w-[120px] truncate text-[9px]"
                                >
                                  {skill}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className={`px-4 pb-0 sm:px-5`}>
                        <div className="-mx-4 border-t bg-muted/[0.12] px-4 pb-5 sm:-mx-5 sm:px-5">
                          {(phase.skills || []).length > 0 && (
                            <div className="pt-4">
                              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Focus skills
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {phase.skills.map((skill, skillIndex) => (
                                  <span
                                    key={`${skill}-${skillIndex}`}
                                    className="rounded-md border bg-background px-2.5 py-1.5 text-[10px] font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {(phase.topics || []).length > 0 && (
                            <div className="pt-5">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  What to learn
                                </p>
                                <span className="text-[9px] text-muted-foreground">
                                  {topicCount}{" "}
                                  {topicCount === 1 ? "topic" : "topics"}
                                </span>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {phase.topics.map((topic, topicIndex) => (
                                  <div
                                    key={`${topic}-${topicIndex}`}
                                    className="flex items-start gap-2 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/30"
                                  >
                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">
                                      {topicIndex + 1}
                                    </span>
                                    <span className="text-[11px] leading-4">
                                      {topic}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(phase.practiceTasks || []).length > 0 && (
                            <div className="pt-5">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Build & practice
                                </p>
                                <span className="text-[9px] text-muted-foreground">
                                  Do these to make the skill stick
                                </span>
                              </div>
                              <div className="space-y-2">
                                {phase.practiceTasks.map((task, taskIndex) => (
                                  <div
                                    key={`${task}-${taskIndex}`}
                                    className="group/task flex items-start gap-3 rounded-lg border bg-background p-3 transition-all hover:border-primary/20 hover:shadow-sm"
                                  >
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold text-muted-foreground">
                                      {taskIndex + 1}
                                    </span>
                                    <p className="flex-1 text-[11px] leading-5 text-muted-foreground">
                                      {task}
                                    </p>
                                    <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary opacity-60 transition-opacity group-hover/task:opacity-100" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-5 flex items-center justify-between border-t pt-4">
                            <span className="text-[10px] text-muted-foreground">
                              Phase {index + 1} of {learningPlan.length}
                            </span>
                            {index < learningPlan.length - 1 ? (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                Next: Phase {index + 2}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                                Final phase
                                <IconCheck className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card id="opportunities" className="scroll-mt-20 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconBriefcase className="h-4 w-4 text-primary" />
            Recommended Placement Opportunities
          </CardTitle>
          <CardDescription className="text-xs">
            Active campus opportunities matched against your roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendedJobs.map((job, index) => (
            <div
              key={`${job.title}-${index}`}
              className={`rounded-xl border border-l-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${getMatchBorderClass(job.matchScore)}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{job.title}</p>
                    <Badge variant="outline" className="text-[9px]">
                      {job.matchScore}% Match
                    </Badge>
                    {job.requireMock && (
                      <Badge
                        variant="outline"
                        className="text-[9px] text-amber-600"
                      >
                        Mock Required
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {job.companyName} · ₹{job.ctcMax} · {job.location}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  View Opportunity
                  <IconArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(job.skillGaps || []).map((gap, gapIndex) => (
                  <Badge
                    key={`${gap}-${gapIndex}`}
                    variant="secondary"
                    className="text-[9px]"
                  >
                    {gap}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
