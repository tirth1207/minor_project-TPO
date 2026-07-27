export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
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
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id

    if (role !== "COLLEGE_ADMIN" || !org_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { localStatus } = await request.json()
    if (!localStatus || !["APPROVED", "REJECTED", "PENDING"].includes(localStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    // Verify mapping ownership
    const { data: mapping, error: mappingError } = await supabase
      .from("job_college_mappings")
      .select("id, org_id")
      .eq("id", id)
      .maybeSingle()

    if (mappingError || !mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 })
    }

    if (mapping.org_id !== org_id) {
      return NextResponse.json({ error: "Forbidden: You do not own this mapping" }, { status: 403 })
    }

    const { data: updated, error: updateError } = await supabase
      .from("job_college_mappings")
      .update({ local_status: localStatus })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ mapping: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
