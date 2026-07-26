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

    // 2. Authorize (SA)
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "SA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Fetch jobs with company details and eligible branches
    const { data: jobs, error } = await supabase
      .from("job_postings")
      .select(`
        *,
        company:company_profiles (
          company_name,
          website
        ),
        job_eligible_branches (
          branch_name
        )
      `)
      .order("id", { ascending: false })

    if (error) throw error

    return NextResponse.json({ jobs: jobs || [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred retrieving job postings" },
      { status: 500 }
    )
  }
}
