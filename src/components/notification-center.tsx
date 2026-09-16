"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconBell, IconCheck, IconRefresh, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

export type AppNotification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  type?: string | null
  link?: string | null
}

type NotificationsResponse = {
  notifications: AppNotification[]
  count: number
  hasMore: boolean
}

function timeAgo(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) {
    return "Just now"
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return new Date(value).toLocaleDateString()
}

export function NotificationCenter() {
  const pathname = usePathname()
  const supabase = React.useMemo(() => createClient(), [])
  const [items, setItems] = React.useState<AppNotification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=100", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load notifications")
      }

      const data: NotificationsResponse = await response.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
    } catch (error) {
      console.error("Notification center load failed:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()

    const timer = window.setInterval(() => {
      void load()
    }, 15000)

    return () => window.clearInterval(timer)
  }, [load, pathname])

  React.useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function subscribeToNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || cancelled) {
        return
      }

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void load()
          }
        )
        .subscribe((status:any) => {
          if (status === "CHANNEL_ERROR") {
            console.warn("Notification realtime subscription failed")
          }
        })
    }

    void subscribeToNotifications()

    return () => {
      cancelled = true

      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [load, supabase])

  const unreadCount = items.filter((item) => !item.is_read).length

  const markRead = async (id: string, isRead = true) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              is_read: isRead,
            }
          : item
      )
    )

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead }),
      })

      if (!response.ok) {
        throw new Error("Failed to update notification")
      }
    } catch (error) {
      console.error("Notification update failed:", error)
      await load()
    }
  }

  const markAllRead = async () => {
    if (!unreadCount) {
      return
    }

    setBusy(true)

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read")
      }

      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        }))
      )
    } catch (error) {
      console.error("Mark all notifications read failed:", error)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    const previous = items

    setItems((current) => current.filter((item) => item.id !== id))

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }
    } catch (error) {
      console.error("Notification delete failed:", error)
      setItems(previous)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            className="relative"
            aria-label="Notifications"
          >
            <IconBell />
          </Button>
        }
      />

      <PopoverContent
        align="end"
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount
                ? `${unreadCount} unread`
                : "You&apos;re all caught up"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void load()}
              disabled={loading}
              aria-label="Refresh notifications"
            >
              <IconRefresh className={loading ? "animate-spin" : ""} />
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllRead()}
                disabled={busy}
              >
                <IconCheck className="mr-1 h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <IconBell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New placement activity will appear here.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`border-b px-4 py-3 last:border-b-0 ${
                  !item.is_read ? "bg-muted/40" : ""
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      item.is_read
                        ? "bg-muted-foreground/20"
                        : "bg-primary"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            void markRead(item.id)
                            setOpen(false)
                          }}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold">{item.title}</p>
                      )}

                      <div className="flex shrink-0 items-center gap-1">
                        {!item.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => void markRead(item.id)}
                            aria-label="Mark as read"
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => void remove(item.id)}
                          aria-label="Delete notification"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.message}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
