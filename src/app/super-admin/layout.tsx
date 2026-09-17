"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
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
  IconSettings,
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
    {
      title: "Settings",
      url: "/super-admin/settings",
      icon: <IconSettings className="size-4" />,
      isActive: pathname.startsWith("/super-admin/settings"),
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
            children
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
