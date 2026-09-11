export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase } = auth

    const [
      orgTotal,
      orgActive,
      orgPending,
      orgRejected,
      companyTotal,
      companyActive,
      companyPending,
      companyRejected,
      jobTotal,
      jobApproved,
      jobPending,
      jobRejected,
      studentTotal,
      studentPlaced,
    ] = await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "REJECTED"),
      supabase.from("company_profiles").select("id", { count: "exact", head: true }),
      supabase.from("company_profiles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("company_profiles").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("company_profiles").select("id", { count: "exact", head: true }).eq("status", "REJECTED"),
      supabase.from("job_postings").select("id", { count: "exact", head: true }),
      supabase.from("job_postings").select("id", { count: "exact", head: true }).eq("global_status", "APPROVED"),
      supabase.from("job_postings").select("id", { count: "exact", head: true }).eq("global_status", "PENDING"),
      supabase.from("job_postings").select("id", { count: "exact", head: true }).eq("global_status", "REJECTED"),
      supabase.from("student_profiles").select("id", { count: "exact", head: true }),
      supabase.from("student_profiles").select("id", { count: "exact", head: true }).eq("is_placed", true),
    ])

    const results = [
      orgTotal, orgActive, orgPending, orgRejected,
      companyTotal, companyActive, companyPending, companyRejected,
      jobTotal, jobApproved, jobPending, jobRejected,
      studentTotal, studentPlaced,
    ]

    const failed = results.find((result) => result.error)
    if (failed) {
      console.error("GET /api/super-admin/stats query failed:", failed.error)
      return NextResponse.json({ error: "Unable to load dashboard statistics" }, { status: 500 })
    }

    const orgsTotal = orgTotal.count ?? 0
    const companiesTotal = companyTotal.count ?? 0
    const jobsTotal = jobTotal.count ?? 0
    const studentsTotal = studentTotal.count ?? 0
    const studentsPlaced = studentPlaced.count ?? 0

    return NextResponse.json({
      organizations: {
        total: orgsTotal,
        active: orgActive.count ?? 0,
        pending: orgPending.count ?? 0,
        rejected: orgRejected.count ?? 0,
      },
      companies: {
        total: companiesTotal,
        active: companyActive.count ?? 0,
        pending: companyPending.count ?? 0,
        rejected: companyRejected.count ?? 0,
      },
      jobs: {
        total: jobsTotal,
        active: jobApproved.count ?? 0,
        pending: jobPending.count ?? 0,
        rejected: jobRejected.count ?? 0,
      },
      students: {
        total: studentsTotal,
        placed: studentsPlaced,
        unplaced: Math.max(0, studentsTotal - studentsPlaced),
      },
    })
  } catch (error: unknown) {
    console.error("GET /api/super-admin/stats failed:", error)
    return NextResponse.json({ error: "Unable to load dashboard statistics" }, { status: 500 })
  }
}
