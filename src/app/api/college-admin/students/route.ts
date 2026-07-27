export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

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
      .eq("user.org_id", orgId)

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
