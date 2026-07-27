export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET() {
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
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id

    if (role !== "COLLEGE_ADMIN" || !org_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: invites, error: fetchError } = await supabase
      .from("invite_links")
      .select("*, department:departments!inner(id, name, org_id)")
      .eq("department.org_id", org_id)

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

    const { departmentId } = await request.json()
    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    // Validate that department belongs to this org
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .eq("org_id", org_id)
      .maybeSingle()

    if (deptError || !dept) {
      return NextResponse.json({ error: "Department not found in your organization" }, { status: 400 })
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
