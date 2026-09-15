"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import { CompanyProvider, useCompany } from "./company-context"

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
  IconBell,
  IconBriefcase,
  IconChartArea,
  IconLifebuoy,
  IconLoader,
  IconPlus,
  IconRefresh,
  IconSend,
  IconUsers,
} from "@tabler/icons-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function CompanyDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const supabase = React.useMemo(() => createClient(), [])
  const {notification} = useCompany()
  const unreadCount =
  notification.notifications?.filter((item: any) => !item.is_read).length ?? 0
  const [user, setUser] = React.useState({
    name: "Loading...",
    email: "",
    avatar: "/avatars/default.jpg",
  })

  const {
    loading,
    refreshing,
    error,
    companyStatus,
    fetchData,
  } = useCompany()

  // ---------------------------------------------------------
  // User
  // ---------------------------------------------------------

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me")

        if (!res.ok) {
          console.error(
            "Failed to fetch user:",
            res.status,
            res.statusText
          )
          return
        }

        const data = await res.json()

        const email = data.user?.email ?? ""

        const name =
          data.companyProfile?.company_name ||
          email.split("@")[0] ||
          "Corporate Partner"

        setUser({
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            name
          )}`,
        })
      } catch (error) {
        console.error(
          "Error fetching company user:",
          error
        )
      }
    }

    fetchUser()
  }, [])

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()

      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // ---------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------

  const navMain = [
    {
      title: "Dashboard",
      url: "/company",
      icon: <IconChartArea className="size-4" />,
      isActive: pathname === "/company" || pathname.startsWith("/company"),
    },
    {
      title: "Posted Jobs",
      url: "/company/jobs",
      icon: <IconBriefcase className="size-4" />,
      isActive:
        pathname === "/company/jobs" ||
        pathname.startsWith("/company/jobs/"),
    },
    {
      title: "Review Applicants",
      url: "/company/applicants",
      icon: <IconUsers className="size-4" />,
      isActive:
        pathname === "/company/applicants" ||
        pathname.startsWith("/company/applicants/"),
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

  // ---------------------------------------------------------
  // Breadcrumb
  // ---------------------------------------------------------

  const currentPage =
    navMain.find((item) => item.isActive)?.title ??
    "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar
        title="TPO Portal"
        subtitle="Corporate Partner"
        navMain={navMain}
        navSecondary={navSecondary}
        user={user}
        func={handleLogout}
      />

      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-6 dark:border-secondary">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50" />

            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/company/jobs">
                    Corporate Partner
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator className="hidden md:block" />

                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {currentPage}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="secondary"
                    className="relative"
                  >
                    <IconBell />

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                }
              />

              <PopoverContent
                align="end"
                className="w-80 p-0"
              >
                <div className="border-b px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Notifications
                    </h3>

                    {unreadCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notification.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                      <IconBell className="mb-2 h-8 w-8 text-muted-foreground/50" />

                      <p className="text-sm font-medium">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        You're all caught up.
                      </p>
                    </div>
                  ) : (
                    notification.notifications.map((item: any) => (
                      <div
                        key={item.id}
                        className={`border-b px-4 py-3 last:border-b-0 ${
                          !item.is_read
                            ? "bg-muted/40"
                            : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            <IconBell className="h-4 w-4 text-primary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold">
                                {item.title}
                              </p>

                              {!item.is_read && (
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.message}
                            </p>

                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>


            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              title="Refresh Data"
              className="cursor-pointer rounded-lg border border-secondary p-1.5 text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-secondary dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              <IconRefresh
                className={`h-4.5 w-4.5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Company approval status */}
          {companyStatus !== "ACTIVE" && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
              <IconAlertCircle className="h-5 w-5 shrink-0" />

              <div>
                <p className="font-bold">
                  Your corporate account is pending approval
                </p>

                <p className="mt-0.5 text-xs">
                  Your dashboard features are restricted.
                  You can browse, but cannot publish new job
                  postings until the Super Admin verifies your
                  corporate credentials.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Failed to load data
                </p>

                <p className="mt-0.5 text-xs opacity-90">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Loading / Page */}
          {loading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
              <IconLoader className="h-8 w-8 animate-spin text-primary" />

              <span className="text-sm font-medium text-zinc-500">
                Fetching corporate panel...
              </span>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CompanyProvider>
      <CompanyDashboardShell>
        {children}
      </CompanyDashboardShell>
    </CompanyProvider>
  )
}