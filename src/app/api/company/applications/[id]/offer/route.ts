export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireActiveCompany()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    const { ctcOffered } = await request.json()
    if (!ctcOffered) {
      return NextResponse.json({ error: "ctcOffered package is required in LPA" }, { status: 400 })
    }

    const parsedCtc = parseFloat(ctcOffered)
    if (isNaN(parsedCtc) || parsedCtc <= 0) {
      return NextResponse.json({ error: "ctcOffered must be a valid positive package value" }, { status: 400 })
    }

    // Verify application ownership
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        id,
        job_college_mapping:job_college_mappings!inner(
          job:job_postings!inner(
            company_id
          )
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const appCompanyId = (application.job_college_mapping as any)?.job?.company_id
    if (appCompanyId !== companyId) {
      return NextResponse.json({ error: "Forbidden: You do not own this application" }, { status: 403 })
    }

    // Insert new offer for the application as EXTENDED
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        application_id: id,
        ctc_offered: parsedCtc,
        status: "EXTENDED",
      })
      .select()
      .single()

    if (offerError) {
      // Handle unique constraint or general error
      if (offerError.code === "23505") {
        return NextResponse.json({ error: "An offer has already been extended for this candidate." }, { status: 400 })
      }
      return NextResponse.json({ error: offerError.message }, { status: 400 })
    }

    return NextResponse.json({ offer, message: "Job offer extended successfully!" }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
