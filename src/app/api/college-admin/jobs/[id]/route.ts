export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

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

    if (mapping.org_id !== orgId) {
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
