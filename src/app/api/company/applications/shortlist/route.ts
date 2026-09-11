export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { canTransitionApplication, isApplicationStatus, type ApplicationStatus } from "@/lib/applications/status"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const auth = await requireActiveCompany()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth
    const { applicationIds } = await request.json()

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: "applicationIds array is required" }, { status: 400 })
    }

    const uniqueApplicationIds = [...new Set(applicationIds)]
    if (
      uniqueApplicationIds.some((id) => typeof id !== "string") ||
      uniqueApplicationIds.length !== applicationIds.length
    ) {
      return NextResponse.json({ error: "applicationIds must contain unique string IDs" }, { status: 400 })
    }

    const { data: apps, error: appsError } = await supabase
      .from("applications")
      .select(`
        id,
        status,
        job_college_mapping:job_college_mappings!inner(
          job:job_postings!inner(
            company_id
          )
        )
      `)
      .in("id", uniqueApplicationIds)

    if (appsError) {
      console.error("Failed to load applications for shortlist:", appsError)
      return NextResponse.json({ error: "Failed to load applications" }, { status: 500 })
    }

    if (!apps || apps.length !== uniqueApplicationIds.length) {
      return NextResponse.json({ error: "Some applications could not be resolved" }, { status: 404 })
    }

    for (const app of apps) {
      const appCompanyId = (app.job_college_mapping as { job?: { company_id?: string } })?.job?.company_id
      if (appCompanyId !== companyId) {
        return NextResponse.json({ error: "Forbidden: You do not own all selected applications" }, { status: 403 })
      }

      if (!isApplicationStatus(app.status)) {
        return NextResponse.json({ error: "Application has an invalid status" }, { status: 409 })
      }

      if (!canTransitionApplication(app.status as ApplicationStatus, "SHORTLISTED")) {
        return NextResponse.json(
          { error: `Application ${app.id} cannot be shortlisted from its current status` },
          { status: 409 }
        )
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update({ status: "SHORTLISTED" })
      .in("id", uniqueApplicationIds)
      .eq("status", "APPLIED")
      .select()

    if (updateError) {
      console.error("Failed to shortlist applications:", updateError)
      return NextResponse.json({ error: "Failed to shortlist applications" }, { status: 500 })
    }

    if (!updated || updated.length !== uniqueApplicationIds.length) {
      return NextResponse.json(
        { error: "Some applications changed before they could be shortlisted. Please refresh and try again." },
        { status: 409 }
      )
    }

    return NextResponse.json({ updated, message: "Applications shortlisted successfully!" })
  } catch (error: unknown) {
    console.error("POST /api/company/applications/shortlist:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
