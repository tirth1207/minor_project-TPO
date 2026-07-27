export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET() {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

    const { data: invites, error: fetchError } = await supabase
      .from("invite_links")
      .select("*, department:departments!inner(id, name, org_id)")
      .eq("department.org_id", orgId)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ invites })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId, user } = auth

    const { departmentId } = await request.json()
    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    // Validate that department belongs to this org and is ACTIVE
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id, status")
      .eq("id", departmentId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (deptError || !dept) {
      return NextResponse.json({ error: "Department not found in your organization" }, { status: 404 })
    }

    if (dept.status !== "ACTIVE") {
      return NextResponse.json({ error: "Forbidden: Invitations can only be generated for ACTIVE departments." }, { status: 403 })
    }

    // Generate random 24-character token
    const token = crypto.randomBytes(12).toString("hex") // exactly 24 hex characters
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 days

    const { data: invite, error: insertError } = await supabase
      .from("invite_links")
      .insert({
        dept_id: departmentId,
        token,
        created_by: user.id,
        expires_at,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    const inviteUrl = `/register?token=${token}`

    return NextResponse.json({ invite, inviteUrl }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
