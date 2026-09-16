"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconArrowLeft, IconBell } from "@tabler/icons-react"
import { NotificationCenter } from "@/components/notification-center"

const roleRoots = new Set(["student", "mentor", "company", "college-admin", "super-admin"])

export default function NotificationsPage() {
  const pathname = usePathname()
  const root = pathname.split("/").filter(Boolean)[0]
  const dashboard = root && roleRoots.has(root) ? `/${root}` : "/dashboard"

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={dashboard} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <IconArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <IconBell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-sm text-muted-foreground">Updates and activity from your TPO portal.</p>
            </div>
          </div>
        </div>
        <NotificationCenter />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-background">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Recent activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">Use the notification bell to mark items as read or remove them.</p>
        </div>
        <div className="p-5 text-sm text-muted-foreground">
          Notifications are loaded securely for the signed-in account. New activity is refreshed automatically.
        </div>
      </section>
    </main>
  )
}
