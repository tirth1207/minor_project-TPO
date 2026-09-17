"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Point = { label: string; value: number; secondary?: number; color?: string }

// Palette of soft, pastel subtle colors (Green, Red, Yellow, Teal, Blue, Purple, Soft Amber, Indigo)
const PASTEL_PALETTE = [
  "#86efac", // Soft Pastel Green
  "#fef08a", // Soft Pastel Yellow / Amber
  "#fca5a5", // Soft Pastel Red / Rose
  "#93c5fd", // Soft Pastel Blue
  "#cbd5e1", // Soft Slate / Neutral Pastel
  "#c084fc", // Soft Pastel Purple
  "#99f6e4", // Soft Pastel Teal
  "#fed7aa", // Soft Pastel Orange
]

function getPastelColor(label: string, index: number, customColor?: string): string {
  if (customColor) return customColor

  const lower = label.toLowerCase().trim()

  // Positive / Active / Approved / Placed / Passed / Eligible / Selected -> Subtle Pastel Green
  if (
    lower.includes("active") ||
    lower.includes("approved") ||
    lower.includes("placed") ||
    lower.includes("passed") ||
    lower.includes("eligible") ||
    lower.includes("selected") ||
    lower.includes("shortlisted") ||
    lower.includes("high")
  ) {
    return "#86efac"
  }

  // Pending / Applied / Offered / Unplaced -> Subtle Pastel Yellow/Amber
  if (
    lower.includes("pending") ||
    lower.includes("applied") ||
    lower.includes("offered") ||
    lower.includes("unplaced") ||
    lower.includes("review")
  ) {
    return "#fef08a"
  }

  // Rejected / Not passed / Not eligible / Backlog / Withdrawn -> Subtle Pastel Red/Rose
  if (
    lower.includes("reject") ||
    lower.includes("not passed") ||
    lower.includes("not eligible") ||
    lower.includes("backlog") ||
    lower.includes("withdrawn")
  ) {
    return "#fca5a5"
  }

  // Entity types: Colleges -> Pastel Teal, Companies -> Pastel Blue, Jobs -> Pastel Purple, Students -> Pastel Indigo
  if (lower.includes("college") || lower.includes("department") || lower.includes("branch")) return "#99f6e4"
  if (lower.includes("company")) return "#93c5fd"
  if (lower.includes("job") || lower.includes("drive") || lower.includes("opening")) return "#c084fc"
  if (lower.includes("student") || lower.includes("applicant") || lower.includes("mentor")) return "#a5b4fc"

  return PASTEL_PALETTE[index % PASTEL_PALETTE.length]
}

export function AnalyticsBars({ title, description, data }: { title: string; description?: string; data: Point[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No data available yet.</p> : data.map((item, index) => {
            const barColor = getPastelColor(item.label, index, item.color)
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: barColor }} />
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: barColor }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDonut({ title, description, data }: { title: string; description?: string; data: Point[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cursor = 0
  const stops = data.map((item, index) => {
    const start = total ? (cursor / total) * 100 : 0
    cursor += item.value
    const color = getPastelColor(item.label, index, item.color)
    return `${item.value === 0 ? "transparent" : color} ${start}% ${total ? (cursor / total) * 100 : 0}%`
  }).join(", ")

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative size-32 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${stops})` : "var(--muted)" }}>
            <div className="absolute inset-5 flex items-center justify-center rounded-full bg-card shadow-inner">
              <span className="text-2xl font-semibold">{total}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {data.map((item, index) => {
              const itemColor = getPastelColor(item.label, index, item.color)
              return (
                <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: itemColor }} />
                    <span className="truncate text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsTrend({ title, description, data }: { title: string; description?: string; data: Point[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No trend data available yet.</p>
        ) : (
          <div className="flex h-48 items-end gap-1 border-b border-border px-1 pt-4">
            {data.map((item, index) => {
              const barColor = getPastelColor(item.label, index, item.color)
              return (
                <div key={item.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div
                    title={`${item.label}: ${item.value}`}
                    className="w-full max-w-8 rounded-t transition-all"
                    style={{ height: `${Math.max((item.value / max) * 100, 3)}%`, backgroundColor: barColor }}
                  />
                  <span className="max-w-full truncate text-[9px] text-muted-foreground">{item.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
