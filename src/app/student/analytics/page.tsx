"use client"

import * as React from "react"

import {
  AnalyticsBars,
  AnalyticsDonut,
} from "@/components/dashboard-analytics"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useStudent } from "../student-context"

export default function StudentAnalyticsPage() {
  const { applications, mockInterviews } = useStudent()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [analytics, setAnalytics] = React.useState({
    applications: applications.length,
    evaluatedMocks: mockInterviews.filter(
      (mock) => mock.status === "EVALUATED"
    ).length,
    passedMocks: mockInterviews.filter(
      (mock) => mock.status === "EVALUATED" && mock.passed === true
    ).length,
  })

  React.useEffect(() => {
    let active = true

    async function loadAnalytics() {
      try {
        setLoading(true)
        setError(null)

        const [applicationsResponse, mocksResponse] = await Promise.all([
          fetch("/api/students/applications", { cache: "no-store" }),
          fetch("/api/students/mock-interviews", { cache: "no-store" }),
        ])

        if (!applicationsResponse.ok || !mocksResponse.ok) {
          throw new Error("Unable to load student analytics")
        }

        const applicationsData = await applicationsResponse.json()
        const mocksData = await mocksResponse.json()

        const applicationRows = Array.isArray(applicationsData.applications)
          ? applicationsData.applications
          : []
        const mockRows = Array.isArray(mocksData.mocks)
          ? mocksData.mocks
          : Array.isArray(mocksData.mockInterviews)
            ? mocksData.mockInterviews
            : []

        if (!active) {
          return
        }

        setAnalytics({
          applications: applicationRows.length,
          evaluatedMocks: mockRows.filter(
            (mock: { status?: string }) => mock.status === "EVALUATED"
          ).length,
          passedMocks: mockRows.filter(
            (mock: { status?: string; passed?: boolean | null }) =>
              mock.status === "EVALUATED" && mock.passed === true
          ).length,
        })
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load student analytics"
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      active = false
    }
  }, [])

  const applicationStatus = [
    "APPLIED",
    "SHORTLISTED",
    "REJECTED",
    "WITHDRAWN",
    "SELECTED",
  ].map((status) => ({
    label: status.charAt(0) + status.slice(1).toLowerCase(),
    value: applications.filter((application) => application.status === status)
      .length,
  }))

  const mockOutcomes = [
    {
      label: "Passed",
      value: analytics.passedMocks,
    },
    {
      label: "Not passed",
      value: Math.max(analytics.evaluatedMocks - analytics.passedMocks, 0),
    },
    {
      label: "Pending evaluation",
      value: Math.max(mockInterviews.length - analytics.evaluatedMocks, 0),
    },
  ]

  const skillTotals = new Map<string, { total: number; count: number }>()

  mockInterviews.forEach((mock) => {
    if (!mock.skill_scores) {
      return
    }

    Object.entries(mock.skill_scores).forEach(([skill, score]) => {
      const numericScore = Number(score)

      if (!Number.isFinite(numericScore)) {
        return
      }

      const current = skillTotals.get(skill) ?? {
        total: 0,
        count: 0,
      }

      skillTotals.set(skill, {
        total: current.total + numericScore,
        count: current.count + 1,
      })
    })
  })

  const skillPerformance = [...skillTotals.entries()]
    .map(([skill, result]) => ({
      label: skill,
      value: Math.round(result.total / result.count),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  if (loading) {
    return (
      <div className="portal-page space-y-6">
        <div>
          <Badge variant="secondary" className="rounded-full">
            Personal analytics
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Career analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading your application and mock interview trends.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="min-h-48 animate-pulse" />
          <Card className="min-h-48 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="portal-page space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analytics unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="portal-page space-y-6 pb-8">
      <section>
        <Badge variant="secondary" className="rounded-full">
          Personal analytics
        </Badge>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Career analytics
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review your placement applications and AI mock interview performance
          using data returned by your authenticated student APIs.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Applications</CardDescription>
            <CardTitle className="text-3xl">{analytics.applications}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Evaluated mocks</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.evaluatedMocks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mock pass rate</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.evaluatedMocks
                ? `${Math.round(
                    (analytics.passedMocks / analytics.evaluatedMocks) * 100
                  )}%`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsDonut
          title="Application breakdown"
          description="Current application states from your student account."
          data={applicationStatus}
        />
        <AnalyticsDonut
          title="Mock interview outcomes"
          description="Evaluated, passed, and pending mock sessions."
          data={mockOutcomes}
        />
      </div>

      <AnalyticsBars
        title="Mock skill performance"
        description="Average skill scores calculated from evaluated mock interviews."
        data={skillPerformance}
      />
    </div>
  )
}
