"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type Point = {
  label: string
  value: number
  secondary?: string
  color?: string
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2, #3b82f6)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #8b5cf6)",
  "var(--chart-5, #06b6d4)",
  "var(--destructive)",
]

function getChartColor(point: Point, index: number): string {
  if (point.color) {
    return point.color
  }

  const label = point.label.toLowerCase().trim()

  // Positive / successful states → primary
  if (
    /active|approved|placed|passed|eligible|selected|shortlisted|success|completed|verified|hired/.test(
      label
    )
  ) {
    return "var(--primary)"
  }

  // Pending / in-progress states → amber
  if (
    /pending|applied|offered|review|processing|waiting|scheduled|progress/.test(
      label
    )
  ) {
    return "var(--chart-3, #f59e0b)"
  }

  // Negative / error states → destructive red
  if (
    /reject|rejected|not passed|not eligible|backlog|withdrawn|failed|cancelled|inactive|closed|error|expired/.test(
      label
    )
  ) {
    return "var(--destructive)"
  }

  // Organization-related → blue
  if (/college|department|branch|organization/.test(label)) {
    return "var(--chart-2, #3b82f6)"
  }

  // Company-related → primary
  if (/company|companies/.test(label)) {
    return "var(--primary)"
  }

  // Job-related → cyan
  if (/job|jobs|drive|opening|openings/.test(label)) {
    return "var(--chart-5, #06b6d4)"
  }

  // People-related → purple
  if (/student|students|applicant|applicants|mentor|mentors/.test(label)) {
    return "var(--chart-4, #8b5cf6)"
  }

  return CHART_COLORS[index % CHART_COLORS.length]
}

/* -------------------------------------------------------------------------- */
/* Analytics Bars                                                             */
/* -------------------------------------------------------------------------- */

interface AnalyticsBarsProps {
  data: Point[]
  title?: string
  description?: string
}

export function AnalyticsBars({
  data,
  title,
  description,
}: AnalyticsBarsProps) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {data.map((item, index) => {
              const percentage =
                item.value > 0 ? (item.value / max) * 100 : 0

              const color = getChartColor(item, index)

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.label}
                      </p>

                      {item.secondary && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.secondary}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, percentage))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Analytics Donut                                                            */
/* -------------------------------------------------------------------------- */

interface AnalyticsDonutProps {
  data: Point[]
  title?: string
  description?: string
  centerValue?: string | number
  centerLabel?: string
}

export function AnalyticsDonut({
  data,
  title,
  description,
  centerValue,
  centerLabel,
}: AnalyticsDonutProps) {
  const total = data.reduce(
    (sum, item) => sum + Math.max(0, item.value),
    0
  )

  let cursor = 0

  const stops = data
    .filter((item) => item.value > 0)
    .map((item, index) => {
      const percentage =
        total > 0 ? (item.value / total) * 100 : 0

      const start = cursor
      const end = cursor + percentage

      cursor = end

      return `${getChartColor(item, index)} ${start}% ${end}%`
    })

  const donutBackground =
    total > 0
      ? `conic-gradient(${stops.join(", ")})`
      : "var(--muted)"

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}

          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col items-center gap-8 md:flex-col">
            {/* Donut */}
            <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: donutBackground,
                }}
              />

              {/* Donut center */}
              <div className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border border-border bg-card text-center">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {centerValue ?? total}
                </span>

                {centerLabel && (
                  <span className="mt-1 text-xs text-muted-foreground">
                    {centerLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-3">
              {data.map((item, index) => {
                const percentage =
                  total > 0
                    ? (Math.max(0, item.value) / total) * 100
                    : 0

                const color = getChartColor(item, index)

                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: color,
                        }}
                      />

                      <span className="truncate text-sm text-foreground">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {item.value}
                      </span>

                      <span className="text-xs tabular-nums text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Analytics Trend                                                            */
/* -------------------------------------------------------------------------- */

interface AnalyticsTrendProps {
  data: Point[]
  title?: string
  description?: string
}

export function AnalyticsTrend({
  data,
  title,
  description,
}: AnalyticsTrendProps) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}

          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex h-56 items-end gap-3 overflow-x-auto pb-8">
            {data.map((item, index) => {
              const height =
                item.value > 0 ? (item.value / max) * 100 : 0

              const color = getChartColor(item, index)

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="group flex h-full min-w-12 flex-1 flex-col items-center justify-end"
                >
                  {/* Value tooltip */}
                  <div className="mb-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-sm">
                      {item.value}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className="w-full max-w-12 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.min(100, Math.max(0, height))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className="mt-2 max-w-16 truncate text-center text-xs text-muted-foreground"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
      <p className="text-sm text-muted-foreground">
        No data available
      </p>
    </div>
  )
}