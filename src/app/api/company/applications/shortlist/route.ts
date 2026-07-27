export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { applicationIds } = await request.json()
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: "applicationIds array is required" }, { status: 400 })
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
