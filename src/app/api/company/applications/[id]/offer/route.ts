export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { ctcOffered } = await request.json()
    if (!ctcOffered) {
      return NextResponse.json({ error: "ctcOffered package is required in LPA" }, { status: 400 })
    }

    const parsedCtc = parseFloat(ctcOffered)
    if (isNaN(parsedCtc) || parsedCtc <= 0) {
      return NextResponse.json({ error: "ctcOffered must be a valid positive package value" }, { status: 400 })
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
