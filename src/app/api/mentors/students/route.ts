export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
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
      .select("role, org_id, dept_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id
    const dept_id = dbUser?.dept_id || user.app_metadata?.dept_id

    if (role !== "MENTOR" || !dept_id || !org_id) {
      return NextResponse.json({ error: "Forbidden: Mentor access only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let query = supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!inner(
          org_id,
          dept_id,
          department:departments(
            id,
            name
          )
        )
      `)
      .eq("user.dept_id", dept_id)

    if (status) {
      query = query.eq("profile_status", status)
    }

    const { data: students, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
