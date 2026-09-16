"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Point = { label: string; value: number; secondary?: number }

export function AnalyticsBars({ title, description, data }: { title: string; description?: string; data: Point[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No data available yet.</p> : data.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex justify-between gap-3 text-xs"><span className="truncate font-medium">{item.label}</span><span className="tabular-nums text-muted-foreground">{item.value}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${(item.value / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDonut({ title, description, data }: { title: string; description?: string; data: Point[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cursor = 0
  const stops = data.map((item) => { const start = total ? (cursor / total) * 100 : 0; cursor += item.value; return `${item.value === 0 ? "transparent" : "hsl(var(--foreground))"} ${start}% ${total ? (cursor / total) * 100 : 0}%` }).join(", ")
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative size-32 shrink-0 rounded-full" style={{ background: total ? `conic-gradient(${stops})` : "var(--muted)" }}><div className="absolute inset-5 flex items-center justify-center rounded-full bg-card"><span className="text-2xl font-semibold">{total}</span></div></div>
          <div className="min-w-0 flex-1 space-y-2">{data.map((item) => <div key={item.label} className="flex justify-between gap-3 text-xs"><span className="truncate text-muted-foreground">{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span></div>)}</div>
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
        {data.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No trend data available yet.</p> : <div className="flex h-48 items-end gap-1 border-b border-border px-1 pt-4">{data.map((item) => <div key={item.label} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div title={`${item.label}: ${item.value}`} className="w-full max-w-8 rounded-t bg-foreground transition-all" style={{ height: `${Math.max((item.value / max) * 100, 3)}%` }} /><span className="max-w-full truncate text-[9px] text-muted-foreground">{item.label}</span></div>)}</div>}
      </CardContent>
    </Card>
  )
}
