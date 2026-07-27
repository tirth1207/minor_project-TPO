export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const auth = await requireActiveCompany()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    const { applicationIds } = await request.json()
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: "applicationIds array is required" }, { status: 400 })
    }

    // Fetch applications and verify company ownership
    const { data: apps, error: appsError } = await supabase
      .from("applications")
      .select(`
        id,
        job_college_mapping:job_college_mappings!inner(
          job:job_postings!inner(
            company_id
          )
        )
      `)
      .in("id", applicationIds)

    if (appsError || !apps) {
      return NextResponse.json({ error: appsError?.message || "Applications not found" }, { status: 404 })
    }

    if (apps.length !== applicationIds.length) {
      return NextResponse.json({ error: "Some applications could not be resolved" }, { status: 404 })
    }

    // Verify ownership
    for (const app of apps) {
      const appCompanyId = (app.job_college_mapping as any)?.job?.company_id
      if (appCompanyId !== companyId) {
        return NextResponse.json({ error: "Forbidden: You do not own all selected applications" }, { status: 403 })
      }
    }

    // Bulk update applications
    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update({ status: "SHORTLISTED" })
      .in("id", applicationIds)
      .select()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ updated, message: "Applications shortlisted successfully!" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
