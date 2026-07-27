export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth

    // Parse body
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
