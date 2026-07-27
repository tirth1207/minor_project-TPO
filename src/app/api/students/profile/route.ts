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
      .select("role, org_id, dept_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Retrieve the student's profile, joining organization and department
    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!inner(
          id,
          org_id,
          dept_id,
          department:departments(
            id,
            name
          ),
          organization:organizations(
            id,
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
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
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, cgpa, phone, bio, resume_url, branch, semester } = body

    // Simple validations
    if (!name || !branch || !semester) {
      return NextResponse.json({ error: "Name, branch, and semester are required" }, { status: 400 })
    }

    // Overwrite fields in student_profiles
    const { data: updated, error: updateError } = await supabase
      .from("student_profiles")
      .update({
        name,
        cgpa: cgpa ? parseFloat(cgpa) : 0.0,
        phone,
        bio,
        resume_url,
        branch,
        semester: parseInt(semester),
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ profile: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
