export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { profile_status } = await request.json()
    if (!profile_status || !["APPROVED", "REJECTED", "PENDING"].includes(profile_status)) {
      return NextResponse.json({ error: "Invalid profile_status value" }, { status: 400 })
    }

    // Verify student department boundaries
    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select(`
        id,
        user_id,
        user:users!inner(
          id,
          dept_id
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check if student belongs to the same department as the mentor
    const student_dept_id = (student.user as any)?.dept_id
    if (student_dept_id !== dept_id) {
      return NextResponse.json({ error: "Forbidden: Student department boundary violation" }, { status: 403 })
    }

    // Update profile status and stamp mentor_id
    const { data: updated, error: updateError } = await supabase
      .from("student_profiles")
      .update({
        profile_status,
        mentor_id: user.id, // mentor's user ID
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ student: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
