"use client"

import * as React from "react"
import {
  IconCheck,
  IconLoader,
  IconMail,
  IconShieldCheck,
  IconShieldLock,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuperAdminSettingsPage() {
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/users/me")
        const data = await res.json()
        if (res.ok) {
          setUser(data)
        }
      } catch (err) {
        console.error("Failed to load super admin settings:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Super Admin System Settings
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Global platform administration, root account privileges, and system settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconShieldLock className="size-5 text-primary" />
            Root Account Summary
          </CardTitle>
          <CardDescription>
            Super Administrator account privileges and system governance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <IconLoader className="size-6 animate-spin text-primary" />
            </div>
          ) : user ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconMail className="size-3.5" />
                  Super Admin Email
                </span>
                <p className="font-semibold text-foreground text-sm">{user.user?.email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconShieldCheck className="size-3.5" />
                  Role Privilege
                </span>
                <div>
                  <Badge variant="destructive" className="font-semibold">
                    Super Administrator
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconCheck className="size-3.5" />
                  Platform Scope
                </span>
                <p className="font-semibold text-foreground">Full Cross-Tenant Management</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to fetch root admin details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
