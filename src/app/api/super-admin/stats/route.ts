export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase } = auth
    const [orgsRes, companiesRes, jobsRes, studentsRes] = await Promise.all([
      supabase.from("organizations").select("status"),
      supabase.from("company_profiles").select("status"),
      supabase.from("job_postings").select("global_status"),
      supabase.from("student_profiles").select("is_placed"),
    ])

    if (orgsRes.error) throw new Error("Organizations query failed")
    if (companiesRes.error) throw new Error("Companies query failed")
    if (jobsRes.error) throw new Error("Jobs query failed")
    if (studentsRes.error) throw new Error("Students query failed")

    const orgs = orgsRes.data || []
    const companies = companiesRes.data || []
    const jobs = jobsRes.data || []
    const students = studentsRes.data || []

    return NextResponse.json({
      organizations: {
        total: orgs.length,
        active: orgs.filter((o: { status: string }) => o.status === "ACTIVE").length,
        pending: orgs.filter((o: { status: string }) => o.status === "PENDING").length,
        rejected: orgs.filter((o: { status: string }) => o.status === "REJECTED").length,
      },
      companies: {
        total: companies.length,
        active: companies.filter((c: { status: string }) => c.status === "ACTIVE").length,
        pending: companies.filter((c: { status: string }) => c.status === "PENDING").length,
        rejected: companies.filter((c: { status: string }) => c.status === "REJECTED").length,
      },
      jobs: {
        total: jobs.length,
        active: jobs.filter((j: { global_status: string }) => j.global_status === "APPROVED").length,
        pending: jobs.filter((j: { global_status: string }) => j.global_status === "PENDING").length,
        rejected: jobs.filter((j: { global_status: string }) => j.global_status === "REJECTED").length,
      },
      students: {
        total: students.length,
        placed: students.filter((s: { is_placed: boolean }) => s.is_placed).length,
        unplaced: students.filter((s: { is_placed: boolean }) => !s.is_placed).length,
      },
    })
  } catch (error: unknown) {
    console.error("GET /api/super-admin/stats failed:", error)
    return NextResponse.json({ error: "Unable to load dashboard statistics" }, { status: 500 })
  }
}
