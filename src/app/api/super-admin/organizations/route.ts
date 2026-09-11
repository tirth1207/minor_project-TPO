export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function parsePagination(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawPage = Number(searchParams.get("page") ?? "1")
  const rawLimit = Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT))

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT

  return { page, limit, offset: (page - 1) * limit }
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const { page, limit, offset } = parsePagination(request)

    let query = supabase
      .from("organizations")
      .select(`
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
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter && ["PENDING", "ACTIVE", "REJECTED"].includes(statusFilter)) {
      query = query.eq("status", statusFilter)
    }

    const { data: organizations, error, count } = await query

    if (error) {
      console.error("GET /api/super-admin/organizations failed:", error)
      return NextResponse.json({ error: "Unable to load colleges" }, { status: 500 })
    }

    const total = count ?? 0
    return NextResponse.json({
      organizations: organizations || [],
      pagination: {
        page,
        limit,
        total,
        has_more: offset + limit < total,
      },
    })
  } catch (error: unknown) {
    console.error("GET /api/super-admin/organizations failed:", error)
    return NextResponse.json(
      { error: "Unable to load colleges" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth
    const { name, status } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const allowedStatuses = ["PENDING", "ACTIVE", "REJECTED"]
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid organization status" }, { status: 400 })
    }

    const { data: newOrg, error } = await supabase
      .from("organizations")
      .insert({
        name: name.trim(),
        status: status || "PENDING",
      })
      .select()
      .single()

    if (error) {
      console.error("POST /api/super-admin/organizations failed:", error)
      return NextResponse.json({ error: "Unable to create organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, organization: newOrg })
  } catch (error: unknown) {
    console.error("POST /api/super-admin/organizations failed:", error)
    return NextResponse.json(
      { error: "Unable to create organization" },
      { status: 500 }
    )
  }
}
