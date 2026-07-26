export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Authorize user (SA)
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "SA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse status query parameter
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")

    // Fetch organizations
    let query = supabase.from("organizations").select(`
      id,
      name,
      status,
      created_at,
      departments (
        id,
        name,
        status,
        created_at
      )
    `).order("created_at", { ascending: false })

    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    const { data: organizations, error } = await query

    if (error) throw error

    return NextResponse.json({ organizations: organizations || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred retrieving colleges" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Authorize (SA)
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role

    if (role !== "SA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Parse and validate body
    const { name, status } = await request.json()

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const { data: newOrg, error } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        status: status || "PENDING",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, organization: newOrg })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred creating organization" },
      { status: 500 }
    )
  }
}
