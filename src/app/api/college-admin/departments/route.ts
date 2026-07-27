export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Retrieve user's role and organization ID
    const { data: dbUser } = await supabase
      .from("users")
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    const org_id = dbUser?.org_id || user.app_metadata?.org_id

    if (role !== "COLLEGE_ADMIN" || !org_id) {
      return NextResponse.json({ error: "Forbidden: College Admin access only" }, { status: 403 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const { data: department, error: insertError } = await supabase
      .from("departments")
      .insert({
        org_id,
        name: name.trim(),
        status: "ACTIVE", // Active immediately for college admin created ones
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ department }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

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

    const { data: departments, error: fetchError } = await supabase
      .from("departments")
      .select("*")
      .eq("org_id", org_id)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ departments })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
