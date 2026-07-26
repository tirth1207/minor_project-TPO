import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const { user, session } = data

    // Fetch the role and org details from the public.users table
    const { data: dbUser } = await supabase
      .from("users")
      .select("role, org_id, dept_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role || "STUDENT"
    const org_id = dbUser?.org_id || user.app_metadata?.org_id || null
    const dept_id = dbUser?.dept_id || user.app_metadata?.dept_id || null

    return NextResponse.json({
      user,
      session,
      role,
      org_id,
      dept_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
