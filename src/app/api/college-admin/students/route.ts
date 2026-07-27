export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Fetch all student profiles belonging to this college admin's org_id
    const { data: students, error: fetchError } = await supabase
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
      .eq("user.org_id", org_id)

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
