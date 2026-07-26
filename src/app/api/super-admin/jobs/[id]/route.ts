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
    const { global_status } = await request.json()

    if (!global_status) {
      return NextResponse.json({ error: "global_status is required" }, { status: 400 })
    }

    const { data: updatedJob, error } = await supabase
      .from("job_postings")
      .update({ global_status })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, job: updatedJob })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred updating job global status" },
      { status: 500 }
    )
  }
}
