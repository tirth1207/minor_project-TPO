"use client"

import * as React from "react"
import {
  IconBuilding,
  IconCheck,
  IconLoader,
  IconMail,
  IconSchool,
  IconShieldCheck,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CollegeAdminSettingsPage() {
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
        console.error("Failed to load college admin settings:", err)
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
          College Admin Account Information
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          View your institute profile and administrator credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconSchool className="size-5 text-primary" />
            Institute Account Summary
          </CardTitle>
          <CardDescription>
            College administration privileges and organizational details.
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
                  Administrator Email
                </span>
                <p className="font-semibold text-foreground text-sm">{user.user?.email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconShieldCheck className="size-3.5" />
                  Role
                </span>
                <div>
                  <Badge variant="secondary" className="font-semibold">
                    College Administrator
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconBuilding className="size-3.5" />
                  Organization / Institute ID
                </span>
                <p className="font-mono text-foreground">{user.user?.org_id || "Active Institute"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconCheck className="size-3.5" />
                  Verification Status
                </span>
                <div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                    Verified Institute
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to fetch administrator details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
