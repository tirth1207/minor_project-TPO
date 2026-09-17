"use client"

import * as React from "react"
import {
  IconBriefcase,
  IconBuilding,
  IconGlobe,
  IconLoader,
  IconMail,
  IconShieldCheck,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CompanySettingsPage() {
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
        console.error("Failed to load company settings:", err)
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
          Corporate Partner Profile & Account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          View corporate registration credentials and account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconBuilding className="size-5 text-primary" />
            Company Summary
          </CardTitle>
          <CardDescription>
            Official recruitment credentials and corporate account details.
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
                  <IconBriefcase className="size-3.5" />
                  Company Name
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {user.companyProfile?.company_name || "Corporate Partner"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconMail className="size-3.5" />
                  Corporate Email
                </span>
                <p className="font-semibold text-foreground text-sm">{user.user?.email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconGlobe className="size-3.5" />
                  Website
                </span>
                <p className="font-medium text-primary">
                  {user.companyProfile?.website || "Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <IconShieldCheck className="size-3.5" />
                  Account Status
                </span>
                <div>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                    Approved Corporate Partner
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to fetch corporate profile.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
