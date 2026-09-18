"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/providers/auth-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { CollegeAdminProvider, useCollegeAdmin } from "./college-admin-context"
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
  IconUsers,
} from "@tabler/icons-react"

function CollegeAdminDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user: authUser, loading: authLoading, signOut } = useAuth()
  const {
    loading: collegeAdminLoading,
    refreshing,
    error,
    orgStatus,
    fetchData,
  } = useCollegeAdmin()

  const sidebarUser = React.useMemo(() => {
    const name = authUser?.name || "College Administrator"
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
      url: "/college-admin",
      icon: <IconDashboard className="size-4" />,
      isActive: pathname === "/college-admin",
    },
    {
      title: "Departments",
      url: "/college-admin/departments",
      icon: <IconSchool className="size-4" />,
      isActive: pathname.startsWith("/college-admin/departments"),
    },
    {
      title: "Onboarding Invites",
      url: "/college-admin/invites",
      icon: <IconUsers className="size-4" />,
      isActive: pathname.startsWith("/college-admin/invites"),
    },
    {
      title: "Job Approvals",
      url: "/college-admin/jobs",
      icon: <IconBriefcase className="size-4" />,
      isActive: pathname.startsWith("/college-admin/jobs"),
    },
    {
      title: "Student Roster",
      url: "/college-admin/students",
      icon: <IconUsers className="size-4" />,
      isActive: pathname.startsWith("/college-admin/students"),
    },
    {
      title: "Mentor Verification",
      url: "/college-admin/mentors",
      icon: <IconBuilding className="size-4" />,
      isActive: pathname.startsWith("/college-admin/mentors"),
    },
    {
      title: "Settings",
      url: "/college-admin/settings",
      icon: <IconSettings className="size-4" />,
      isActive: pathname.startsWith("/college-admin/settings"),
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

  const isLoading = authLoading || collegeAdminLoading

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
        title="College Admin"
        subtitle="Placement System"
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
                  <BreadcrumbLink href="/college-admin">
                    College Admin
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
              title="Refresh data"
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
          {orgStatus !== "ACTIVE" && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800">
              <IconAlertCircle className="size-5 shrink-0" />
              <div>
                <p className="font-bold">
                  Your college administration account is pending approval
                </p>
                <p className="mt-0.5 text-xs">
                  Your dashboard features are restricted. You can browse, but
                  cannot create departments, generate onboarding invite tokens,
                  or approve job mappings until the Super Admin verifies your
                  institute registration.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border p-4 text-sm text-destructive">
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

export default function CollegeAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CollegeAdminProvider>
      <CollegeAdminDashboardShell>
        {children}
      </CollegeAdminDashboardShell>
    </CollegeAdminProvider>
  )
}
