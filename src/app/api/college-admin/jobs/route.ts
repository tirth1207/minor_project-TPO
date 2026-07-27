export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id

    if (role !== "COLLEGE_ADMIN" || !org_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Retrieve all mappings matching the admin's college (org_id)
    const { data: mappings, error: fetchError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        job_id,
        org_id,
        local_status,
        job:job_postings(
          id,
          title,
          description,
          ctc_min,
          ctc_max,
          location,
          work_mode,
          min_cgpa,
          max_backlogs,
          global_status,
          company:company_profiles(
            id,
            company_name,
            website
          ),
          branches:job_eligible_branches(
            branch_name
          )
        )
      `)
      .eq("org_id", org_id)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ mappings })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
