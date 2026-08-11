export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth
    const body = await request.json()

    const { isRead } = body

    // Validate input
    if (isRead === undefined || typeof isRead !== "boolean") {
      return NextResponse.json(
        { error: "isRead boolean is required" },
        { status: 400 }
      )
    }

    // Update the notification and verify it belongs to the user
    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[NOTIFICATION PATCH]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      notification,
      message: `Notification marked as ${isRead ? "read" : "unread"}`
    })
  } catch (error: unknown) {
    console.error("[NOTIFICATION PATCH]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    // Delete the notification and verify it belongs to the user
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[NOTIFICATION DELETE]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Check if any row was actually deleted
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id)

    if (count === 0) {
      return NextResponse.json(
        { error: "Notification not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Notification deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("[NOTIFICATION DELETE]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}