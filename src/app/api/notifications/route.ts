export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

function parseNonNegativeInteger(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth
    const { searchParams } = new URL(request.url)

    const requestedLimit = parseNonNegativeInteger(searchParams.get("limit"), DEFAULT_LIMIT)
    const offset = parseNonNegativeInteger(searchParams.get("offset"), 0)

    if (requestedLimit === null || requestedLimit < 1 || requestedLimit > MAX_LIMIT) {
      return NextResponse.json(
        { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
        { status: 400 }
      )
    }

    if (offset === null || offset > MAX_OFFSET) {
      return NextResponse.json(
        { error: `offset must be an integer between 0 and ${MAX_OFFSET}` },
        { status: 400 }
      )
    }

    const limit = requestedLimit
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (unreadOnly) query = query.eq("is_read", false)

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[NOTIFICATIONS GET]", error)
      return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 })
    }

    const total = count ?? 0

    return NextResponse.json({
      notifications: data ?? [],
      count: total,
      hasMore: total > offset + limit,
    })
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS GET]", error)
    return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth
    const body = await request.json().catch(() => ({}))

    if (body.isRead !== true && body.isRead !== false) {
      return NextResponse.json({ error: "isRead boolean is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: body.isRead })
      .eq("user_id", user.id)
      .select("id")

    if (error) {
      console.error("[NOTIFICATIONS PATCH]", error)
      return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 })
    }

    return NextResponse.json({
      updated: data?.length ?? 0,
      message: `Notifications marked as ${body.isRead ? "read" : "unread"}`,
    })
  } catch (error: unknown) {
    console.error("[NOTIFICATIONS PATCH]", error)
    return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 })
  }
}
