export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

    const { name } = await request.json()
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const { data: department, error: insertError } = await supabase
      .from("departments")
      .insert({
        org_id: orgId,
        name: name.trim(),
        status: "PENDING", // Start as PENDING as per requirements
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ department, message: "Department created successfully and is awaiting approval." }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth

    const { data: departments, error: fetchError } = await supabase
      .from("departments")
      .select("*")
      .eq("org_id", orgId)

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
