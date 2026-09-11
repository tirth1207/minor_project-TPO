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

    if (isRead === undefined || typeof isRead !== "boolean") {
      return NextResponse.json(
        { error: "isRead boolean is required" },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("[NOTIFICATION PATCH]", error)
      return NextResponse.json(
        { error: "Unable to update notification" },
        { status: 500 }
      )
    }

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
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
      { error: "Unable to update notification" },
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

    const { data: deletedNotification, error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("[NOTIFICATION DELETE]", error)
      return NextResponse.json(
        { error: "Unable to delete notification" },
        { status: 500 }
      )
    }

    if (!deletedNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
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
      { error: "Unable to delete notification" },
      { status: 500 }
    )
  }
}