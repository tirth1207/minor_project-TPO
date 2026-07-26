export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Authorize (SA)
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "SA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Parse body
    const { name, org_id, status } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }
    if (!org_id) {
      return NextResponse.json({ error: "Organization ID (org_id) is required" }, { status: 400 })
    }

    const { data: newDept, error } = await supabase
      .from("departments")
      .insert({
        name: name.trim(),
        org_id,
        status: status || "PENDING",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, department: newDept })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred creating department" },
      { status: 500 }
    )
  }
}
