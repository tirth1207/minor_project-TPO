export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { canTransitionApplication, isApplicationStatus, type ApplicationStatus } from "@/lib/applications/status"
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

    if (ctcOffered === undefined || ctcOffered === null || ctcOffered === "") {
      return NextResponse.json({ error: "ctcOffered package is required in LPA" }, { status: 400 })
    }

    const parsedCtc = Number(ctcOffered)
    if (!Number.isFinite(parsedCtc) || parsedCtc <= 0) {
      return NextResponse.json({ error: "ctcOffered must be a valid positive package value" }, { status: 400 })
    }

    const { data: application, error: appError } = await supabase
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
      .eq("id", id)
      .maybeSingle()

    if (appError) {
      console.error("Failed to load application for offer:", appError)
      return NextResponse.json({ error: "Failed to load application" }, { status: 500 })
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const appCompanyId = (application.job_college_mapping as { job?: { company_id?: string } })?.job?.company_id
    if (appCompanyId !== companyId) {
      return NextResponse.json({ error: "Forbidden: You do not own this application" }, { status: 403 })
    }

    if (!isApplicationStatus(application.status)) {
      return NextResponse.json({ error: "Application has an invalid status" }, { status: 409 })
    }

    if (!canTransitionApplication(application.status as ApplicationStatus, "OFFERED")) {
      return NextResponse.json(
        { error: "An offer can only be extended to a shortlisted application" },
        { status: 409 }
      )
    }

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
      if (offerError.code === "23505") {
        return NextResponse.json({ error: "An offer has already been extended for this candidate." }, { status: 400 })
      }
      console.error("Failed to create offer:", offerError)
      return NextResponse.json({ error: "Failed to extend job offer" }, { status: 500 })
    }

    const { data: updatedApplication, error: updateError } = await supabase
      .from("applications")
      .update({ status: "OFFERED" })
      .eq("id", id)
      .eq("status", "SHORTLISTED")
      .select("id, status")
      .maybeSingle()

    if (updateError || !updatedApplication) {
      console.error("Failed to transition application after offer creation:", updateError)
      await supabase.from("offers").delete().eq("id", offer.id)
      return NextResponse.json(
        { error: "Failed to finalize application status. The offer was not created." },
        { status: 500 }
      )
    }

    return NextResponse.json({ offer, message: "Job offer extended successfully!" }, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/company/applications/[id]/offer:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
