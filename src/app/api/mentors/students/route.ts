export const dynamic = "force-dynamic"

import { requireActiveMentor } from "@/lib/auth/require-active-mentor"
import { NextResponse } from "next/server"

const VALID_STATUSES = ["APPROVED", "REJECTED", "PENDING"] as const

export async function GET(request: Request) {
  try {
    const auth = await requireActiveMentor()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase, deptId } = auth
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid profile status" }, { status: 400 })
    }

    const query = supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!student_profiles_user_id_fkey!inner(
          id, org_id, dept_id,
          department:departments!users_dept_id_fkey(id, name)
        )
      `)
      .eq("user.dept_id", deptId)

    if (status) query.eq("profile_status", status)

    const { data: students, error } = await query
    if (error) {
      console.error("Mentor students query failed:", error)
      return NextResponse.json({ error: "Unable to load students" }, { status: 500 })
    }

    return NextResponse.json({ students: students ?? [] })
  } catch (error: unknown) {
    console.error("GET /api/mentors/students failed:", error)
    return NextResponse.json({ error: "Unable to load students" }, { status: 500 })
  }
}
