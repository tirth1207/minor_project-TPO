export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id

    if (role !== "COLLEGE_ADMIN" || !org_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Retrieve organization status
    const { data: org, error: fetchError } = await supabase
      .from("organizations")
      .select("status")
      .eq("id", org_id)
      .maybeSingle()

    if (fetchError || !org) {
      return NextResponse.json({ error: fetchError?.message || "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({ org: { status: org.status } })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
