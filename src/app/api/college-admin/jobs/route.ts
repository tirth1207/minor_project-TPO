export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

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
      .eq("org_id", orgId)

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
