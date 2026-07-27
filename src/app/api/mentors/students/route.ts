export const dynamic = "force-dynamic"

import { requireActiveMentor } from "@/lib/auth/require-active-mentor"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const auth = await requireActiveMentor()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, deptId } = auth

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
      .eq("user.dept_id", deptId)

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
