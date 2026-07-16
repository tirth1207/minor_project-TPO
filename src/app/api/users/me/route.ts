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

    // Retrieve users table metadata
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("role, org_id, dept_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role || "STUDENT"
    const org_id = dbUser?.org_id || user.app_metadata?.org_id || null
    const dept_id = dbUser?.dept_id || user.app_metadata?.dept_id || null

    let studentProfile = null
    let companyProfile = null

    if (role === "STUDENT") {
      const { data } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      studentProfile = data
    } else if (role === "COMPANY") {
      const { data } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      companyProfile = data
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
        org_id,
        dept_id,
      },
      studentProfile,
      companyProfile,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred retrieving your profile" },
      { status: 500 }
    )
  }
}
