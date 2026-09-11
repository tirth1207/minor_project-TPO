export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase } = auth
    const { data: jobs, error } = await supabase
      .from("job_postings")
      .select(`
        *,
        company:company_profiles(company_name, website),
        job_eligible_branches(branch_name)
      `)
      .order("id", { ascending: false })

    if (error) {
      console.error("GET /api/super-admin/jobs failed:", error)
      return NextResponse.json({ error: "Unable to load job postings" }, { status: 500 })
    }

    return NextResponse.json({ jobs: jobs || [] })
  } catch (error: unknown) {
    console.error("GET /api/super-admin/jobs failed:", error)
    return NextResponse.json({ error: "Unable to load job postings" }, { status: 500 })
  }
}
