export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const { status, name } = await request.json()

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (name !== undefined) updateData.name = name

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update provided" }, { status: 400 })
    }

    const { data: updatedDept, error } = await supabase
      .from("departments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, department: updatedDept })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred updating department" },
      { status: 500 }
    )
  }
}
