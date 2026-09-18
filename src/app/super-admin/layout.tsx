"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/providers/auth-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
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
  const { user: authUser, loading: authLoading, signOut } = useAuth()

  const {
    loading: superAdminLoading,
    refreshing,
    error,
    fetchData,
  } = useSuperAdmin()

  const sidebarUser = React.useMemo(() => {
    const name = authUser?.name || "Super Administrator"
    const email = authUser?.email || ""
    const avatar = authUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    return { name, email, avatar }
  }, [authUser])

  const handleLogout = async () => {
    await signOut()
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

  const isLoading = authLoading || superAdminLoading

  // Keep the dashboard shell visible after its first successful load.
  // Background refresh/auth changes must not replace existing content with a full-page loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      setHasLoadedOnce(true)
    }
  }, [isLoading])

  return (
    <SidebarProvider>
      <AppSidebar
        title="Super Admin"
        subtitle="Dashboard"
        navMain={navMains}
        navSecondary={navSecondary}
        user={sidebarUser}
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
              disabled={isLoading || refreshing}
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

          {isLoading && !hasLoadedOnce ? (
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
