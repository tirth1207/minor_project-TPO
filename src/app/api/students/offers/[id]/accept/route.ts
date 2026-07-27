export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { status } = await request.json()
    if (!status || !["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid offer status value" }, { status: 400 })
    }

    // Verify ownership of the offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(`
        id,
        status,
        application:applications!inner(
          id,
          student:student_profiles!inner(
            id,
            user_id
          )
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (offerError || !offer) {
      return NextResponse.json({ error: "Job offer not found" }, { status: 404 })
    }

    const student_user_id = (offer.application as any)?.student?.user_id
    if (student_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this offer" }, { status: 403 })
    }

    // Update the offer status
    // Note: The database trigger 'on_offer_accepted' will automatically flag 'is_placed' = true,
    // flip application status to 'OFFERED', and auto-withdraw other active applications/offers.
    const { data: updated, error: updateError } = await supabase
      .from("offers")
      .update({ status })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ offer: updated, message: `Offer ${status.toLowerCase()} successfully!` })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
