export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function PATCH(
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

    // Verify ownership of the offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(`
        id,
        application:applications!inner(
          job_college_mapping:job_college_mappings!inner(
            job:job_postings!inner(
              company_id
            )
          )
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }

    const offerCompanyId = (offer.application as any)?.job_college_mapping?.job?.company_id
    if (offerCompanyId !== companyId) {
      return NextResponse.json({ error: "Forbidden: You do not own this offer" }, { status: 403 })
    }

    // Revoke the offer by updating status to REVOKED
    const { data: updated, error: updateError } = await supabase
      .from("offers")
      .update({ status: "REVOKED" })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ offer: updated, message: "Job offer revoked successfully." })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
