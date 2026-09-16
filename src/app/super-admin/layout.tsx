"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { AnalyticsBars, AnalyticsDonut } from "@/components/dashboard-analytics"
import { createClient } from "@/lib/supabase/client"
import { SuperAdminProvider, useSuperAdmin } from "./super-admin-context"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconDashboard,
  IconLifebuoy,
  IconLoader,
  IconRefresh,
  IconSchool,
  IconSend,
  IconUsers,
} from "@tabler/icons-react"

function SuperAdminDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = React.useMemo(() => createClient(), [])

  const [user, setUser] = React.useState({
    name: "Loading...",
    email: "",
    avatar: "/avatars/default.jpg",
  })

  const {
    loading,
    refreshing,
    error,
    stats,
    fetchData,
  } = useSuperAdmin()

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/users/me")

        if (!response.ok) {
          return
        }

        const data = await response.json()
        const email = data.user?.email ?? ""
        const name =
          data.user?.name ||
          email.split("@")[0] ||
          "Super Administrator"

        setUser({
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            name
          )}`,
        })
      } catch (fetchError) {
        console.error("Error fetching super admin user:", fetchError)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navMains = [
    {
      title: "Dashboard Overview",
      url: "/super-admin",
      icon: <IconDashboard className="size-4" />,
      isActive: pathname === "/super-admin",
    },
    {
      title: "College Management",
      url: "/super-admin/colleges",
      icon: <IconSchool className="size-4" />,
      isActive: pathname.startsWith("/super-admin/colleges"),
    },
    {
      title: "Company Approvals",
      url: "/super-admin/companies",
      icon: <IconBuilding className="size-4" />,
      isActive: pathname.startsWith("/super-admin/companies"),
    },
    {
      title: "Job Postings",
      url: "/super-admin/jobs",
      icon: <IconBriefcase className="size-4" />,
      isActive: pathname.startsWith("/super-admin/jobs"),
    },
  ]

  const navSecondary = [
    {
      title: "Support",
      url: "/support",
      icon: <IconLifebuoy className="size-4" />,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: <IconSend className="size-4" />,
    },
  ]

  const orgStatus = [
    {
      label: "Active",
      value: stats?.organizations.active ?? 0,
    },
    {
      label: "Pending",
      value: stats?.organizations.pending ?? 0,
    },
    {
      label: "Rejected",
      value: stats?.organizations.rejected ?? 0,
    },
  ]

  const companyStatus = [
    {
      label: "Active",
      value: stats?.companies.active ?? 0,
    },
    {
      label: "Pending",
      value: stats?.companies.pending ?? 0,
    },
    {
      label: "Rejected",
      value: stats?.companies.rejected ?? 0,
    },
  ]

  const jobStatus = [
    {
      label: "Approved",
      value: stats?.jobs.active ?? 0,
    },
    {
      label: "Pending",
      value: stats?.jobs.pending ?? 0,
    },
    {
      label: "Rejected",
      value: stats?.jobs.rejected ?? 0,
    },
  ]

  return (
    <SidebarProvider>
      <AppSidebar
        title="Super Admin"
        subtitle="Dashboard"
        navMain={navMains}
        navSecondary={navSecondary}
        user={user}
        func={handleLogout}
      />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/super-admin">
                    Super Admin
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="rounded-lg border p-1.5 disabled:opacity-50"
              title="Refresh Data"
            >
              <IconRefresh
                className={
                  refreshing ? "size-4 animate-spin" : "size-4"
                }
              />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {error && (
            <div className="rounded-xl border p-4 text-sm text-destructive">
              <IconAlertCircle className="mr-2 inline size-4" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <IconLoader className="size-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Colleges",
                    stats?.organizations.total ?? 0,
                    IconSchool,
                  ],
                  [
                    "Companies",
                    stats?.companies.total ?? 0,
                    IconBuilding,
                  ],
                  [
                    "Job Postings",
                    stats?.jobs.total ?? 0,
                    IconBriefcase,
                  ],
                  [
                    "Students",
                    stats?.students.total ?? 0,
                    IconUsers,
                  ],
                ].map(([label, value, Icon]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {label}
                      </span>
                      {React.createElement(
                        Icon as React.ElementType,
                        {
                          className: "size-5 text-muted-foreground",
                        }
                      )}
                    </div>
                    <p className="mt-2 text-3xl font-semibold">
                      {value as number}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <AnalyticsDonut
                  title="College status"
                  description="Live organization distribution from Supabase."
                  data={orgStatus}
                />
                <AnalyticsDonut
                  title="Company status"
                  description="Live company registration distribution."
                  data={companyStatus}
                />
                <AnalyticsDonut
                  title="Job status"
                  description="Live global job approval distribution."
                  data={jobStatus}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <AnalyticsBars
                  title="Platform entities"
                  description="Current totals across the platform."
                  data={[
                    {
                      label: "Colleges",
                      value: stats?.organizations.total ?? 0,
                    },
                    {
                      label: "Companies",
                      value: stats?.companies.total ?? 0,
                    },
                    {
                      label: "Jobs",
                      value: stats?.jobs.total ?? 0,
                    },
                    {
                      label: "Students",
                      value: stats?.students.total ?? 0,
                    },
                  ]}
                />
                <AnalyticsBars
                  title="Placement snapshot"
                  description="Current student placement state."
                  data={[
                    {
                      label: "Placed",
                      value: stats?.students.placed ?? 0,
                    },
                    {
                      label: "Unplaced",
                      value: stats?.students.unplaced ?? 0,
                    },
                  ]}
                />
              </div>

              {children}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SuperAdminProvider>
      <SuperAdminDashboardShell>{children}</SuperAdminDashboardShell>
    </SuperAdminProvider>
  )
}
