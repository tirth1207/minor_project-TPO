export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Authorize user (Must be Super Admin 'SA')
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "SA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Gather stats queries in parallel
    const [
      orgsRes,
      companiesRes,
      jobsRes,
      studentsRes,
    ] = await Promise.all([
      supabase.from("organizations").select("status"),
      supabase.from("company_profiles").select("status"),
      supabase.from("job_postings").select("global_status"),
      supabase.from("student_profiles").select("is_placed"),
    ])

    if (orgsRes.error) throw orgsRes.error
    if (companiesRes.error) throw companiesRes.error
    if (jobsRes.error) throw jobsRes.error
    if (studentsRes.error) throw studentsRes.error

    const orgs = orgsRes.data || []
    const companies = companiesRes.data || []
    const jobs = jobsRes.data || []
    const students = studentsRes.data || []

    const stats = {
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
      }
    }
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred retrieving dashboard stats" },
      { status: 500 }
    )
  }
}
