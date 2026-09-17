"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
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
  IconBriefcase,
  IconChartArea,
  IconLifebuoy,
  IconLoader,
  IconRefresh,
  IconSend,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

function CompanyDashboardShell({
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
    companyStatus,
    fetchData,
  } = useCompany()

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
        console.error("Error fetching company user:", error)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const navMain = [
    {
      title: "Dashboard",
      url: "/company",
      icon: <IconChartArea className="size-4" />,
      isActive:
        pathname === "/company" || pathname.startsWith("/company"),
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
    {
      title: "Settings",
      url: "/company/settings",
      icon: <IconSettings className="size-4" />,
      isActive: pathname.startsWith("/company/settings"),
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

  const currentPage =
    navMain.find((item) => item.isActive)?.title ?? "Dashboard"

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
                  <BreadcrumbPage>{currentPage}</BreadcrumbPage>
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

        <div className="flex flex-1 flex-col gap-6 p-6">
          {companyStatus !== "ACTIVE" && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
              <IconAlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">
                  Your corporate account is pending approval
                </p>
                <p className="mt-0.5 text-xs">
                  Your dashboard features are restricted. You can browse, but
                  cannot publish new job postings until the Super Admin verifies
                  your corporate credentials.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Failed to load data</p>
                <p className="mt-0.5 text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

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
      <CompanyDashboardShell>{children}</CompanyDashboardShell>
    </CompanyProvider>
  )
}
