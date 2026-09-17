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

    const { supabase, dbUser } = auth
    const role = dbUser?.role || auth.user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const status = body?.status
    if (status !== "ACCEPTED" && status !== "REJECTED") {
      return NextResponse.json({ error: "Invalid offer status value" }, { status: 400 })
    }

    const { data: updated, error } = await supabase.rpc("respond_to_offer", {
      p_offer_id: id,
      p_status: status,
    })

    if (error) {
      console.error("Failed to process offer decision:", error)
      const message = error.message?.toLowerCase() ?? ""

      if (message.includes("no longer available") || message.includes("state changed")) {
        return NextResponse.json(
          { error: "This offer is no longer available for a decision." },
          { status: 409 }
        )
      }

      if (message.includes("not found") || message.includes("unauthorized")) {
        return NextResponse.json({ error: "Job offer not found" }, { status: 404 })
      }

      return NextResponse.json({ error: "Unable to process offer decision" }, { status: 500 })
    }

    return NextResponse.json({
      offer: updated,
      message: `Offer ${status.toLowerCase()} successfully!`,
    })
  } catch (error: unknown) {
    console.error("PATCH /api/students/offers/[id]/accept failed:", error)
    return NextResponse.json({ error: "Unable to process offer decision" }, { status: 500 })
  }
}
