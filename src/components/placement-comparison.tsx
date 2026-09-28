"use client"

import * as React from "react"
import { IconArrowDown, IconArrowUp, IconChartBar, IconPlus, IconRefresh, IconTrendingUp } from "@tabler/icons-react"

type Scope = "college" | "department" | "mentor" | "company"
type RecordRow = {
  id: string
  academic_year: number
  scope_type: Scope
  department_id: string | null
  department_name: string | null
  mentor_id: string | null
  mentor_name: string | null
  company_id: string | null
  company_name: string | null
  total_students: number
  eligible_students: number
  placed_students: number
  companies_participated: number
  total_offers: number
  avg_ctc: number
  median_ctc: number
  highest_ctc: number
  lowest_ctc: number
}

const years = [2024, 2025]

function pct(placed: number, eligible: number) {
  return eligible ? Math.round((placed / eligible) * 1000) / 10 : 0
}

function delta(current: number, previous: number) {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function Metric({ label, value, previous, suffix = "" }: { label: string; value: number; previous?: number; suffix?: string }) {
  const d = previous === undefined ? null : delta(value, previous)
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight">{value.toLocaleString("en-IN")}{suffix}</p>
        {d !== null && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${d >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {d >= 0 ? <IconArrowUp className="size-3.5" /> : <IconArrowDown className="size-3.5" />}
            {Math.abs(d)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function PlacementComparison({ canManage = false, allowedScopes = ["college", "department", "mentor", "company"] as Scope[] }: { canManage?: boolean; allowedScopes?: Scope[] }) {
  const [scope, setScope] = React.useState<Scope>(allowedScopes[0] || "college")
  const [year, setYear] = React.useState(2025)
  const [compareYear, setCompareYear] = React.useState(2024)
  const [rows, setRows] = React.useState<RecordRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ academic_year: "2025", scope_type: "college", total_students: "438", eligible_students: "389", placed_students: "319", companies_participated: "46", total_offers: "352", avg_ctc: "5.18", median_ctc: "4.70", highest_ctc: "15.20", lowest_ctc: "2.60" })

  const load = React.useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/placement-comparison?scope=${scope}`, { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Unable to load placement history")
      setRows(body.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load placement history")
    } finally { setLoading(false) }
  }, [scope])

  React.useEffect(() => {
    if (!allowedScopes.includes(scope)) setScope(allowedScopes[0] || "college")
  }, [allowedScopes, scope])

  React.useEffect(() => { load() }, [load])

  const current = rows.find((r) => r.academic_year === year) || null
  const previous = rows.find((r) => r.academic_year === compareYear) || null
  const rate = current ? pct(current.placed_students, current.eligible_students) : 0
  const previousRate = previous ? pct(previous.placed_students, previous.eligible_students) : 0

  async function addRecord(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k,v]) => [k, k === "scope_type" ? v : Number(v)]))
      const res = await fetch("/api/placement-comparison", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Unable to save record")
      setShowForm(false); await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save record") }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold">
            <IconChartBar className="size-3.5" /> Historical Placement Intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Placement Comparison</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Compare placement outcomes across academic years by college, department, mentor, or company.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><IconRefresh className="size-4" /> Refresh</button>
          {canManage && <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><IconPlus className="size-4" /> Add data</button>}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        {allowedScopes.length > 1 && <label className="text-sm font-medium">View<select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3">{allowedScopes.map((value) => <option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label>}
        <label className="text-sm font-medium">Current year<select value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border bg-background px-3">{years.map(y => <option key={y} value={y}>{y}-{String(y+1).slice(-2)}</option>)}</select></label>
        <label className="text-sm font-medium">Compare with<select value={compareYear} onChange={(e) => setCompareYear(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border bg-background px-3">{years.filter(y => y !== year).map(y => <option key={y} value={y}>{y}-{String(y+1).slice(-2)}</option>)}</select></label>
      </div>

      {loading ? <div className="rounded-2xl border p-12 text-center text-sm text-muted-foreground">Loading historical placement data…</div> : !current ? <div className="rounded-2xl border border-dashed p-12 text-center"><p className="font-semibold">No data for {year}-{String(year+1).slice(-2)}</p><p className="mt-1 text-sm text-muted-foreground">Add a placement snapshot or select another scope.</p></div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Placement rate" value={rate} previous={previousRate} suffix="%" />
            <Metric label="Placed students" value={current.placed_students} previous={previous?.placed_students} />
            <Metric label="Offers" value={current.total_offers} previous={previous?.total_offers} />
            <Metric label="Avg CTC" value={current.avg_ctc} previous={previous?.avg_ctc} suffix=" LPA" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-2"><IconTrendingUp className="size-4" /><h2 className="font-semibold">Year-over-year</h2></div>
              <div className="mt-5 space-y-4 text-sm">
                {[["Eligible", current.eligible_students, previous?.eligible_students],["Placed", current.placed_students, previous?.placed_students],["Companies", current.companies_participated, previous?.companies_participated],["Highest CTC", current.highest_ctc, previous?.highest_ctc]].map(([label,a,b]) => <div key={String(label)}><div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{a}{b !== undefined ? ` vs ${b}` : ""}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${Math.min(100, Number(a)/(Number(b)||Number(a)||1)*50)}%`}} /></div></div>)}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Compensation snapshot</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[["Median CTC",current.median_ctc],["Highest CTC",current.highest_ctc],["Lowest CTC",current.lowest_ctc],["Offers / placed",current.placed_students ? (current.total_offers/current.placed_students).toFixed(2) : "0"]].map(([l,v]) => <div key={String(l)} className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-semibold">{typeof v === "number" ? v.toFixed(2) : v}{String(l).includes("CTC") ? " LPA" : ""}</p></div>)}
              </div>
            </div>
          </div>
          {scope !== "college" && (
            <div className="rounded-2xl border bg-card">
              <div className="border-b px-5 py-4"><h2 className="font-semibold">{scope[0].toUpperCase()+scope.slice(1)} breakdown</h2></div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Placed</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Avg CTC</th><th className="px-5 py-3">Highest</th></tr></thead><tbody>{rows.filter(r=>r.academic_year===year).map(r=><tr key={r.id} className="border-b last:border-0"><td className="px-5 py-3 font-medium">{r.department_name||r.mentor_name||r.company_name||"—"}</td><td className="px-5 py-3">{r.placed_students}</td><td className="px-5 py-3">{pct(r.placed_students,r.eligible_students)}%</td><td className="px-5 py-3">{r.avg_ctc.toFixed(2)} LPA</td><td className="px-5 py-3">{r.highest_ctc.toFixed(2)} LPA</td></tr>)}</tbody></table></div>
            </div>
          )}
        </>
      )}

      {showForm && canManage && (
        <form onSubmit={addRecord} className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Add placement snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">Enter verified institutional figures here. Demo data should be clearly marked as synthetic.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(form).map(([key,value]) => key === "scope_type" ? <label key={key} className="text-sm font-medium">{key.replaceAll("_"," ")}<select value={value} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} className="mt-1 h-10 w-full rounded-xl border px-3"><option value="college">college</option><option value="department">department</option><option value="mentor">mentor</option><option value="company">company</option></select></label> : <label key={key} className="text-sm font-medium">{key.replaceAll("_"," ")}<input value={value} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} type="number" step="0.01" className="mt-1 h-10 w-full rounded-xl border px-3" /></label>)}
          </div>
          <div className="mt-4 flex justify-end"><button disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{saving ? "Saving…" : "Save snapshot"}</button></div>
        </form>
      )}
    </div>
  )
}
