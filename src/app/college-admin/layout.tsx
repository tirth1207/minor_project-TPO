"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { createClient } from "@/lib/supabase/client"
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
  IconUsers,
} from "@tabler/icons-react"

function CollegeAdminDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = React.useMemo(() => createClient(), [])
  const {
    loading,
    refreshing,
    error,
    orgStatus,
    fetchData,
  } = useCollegeAdmin()

  const [user, setUser] = React.useState({
    name: "Loading...",
    email: "",
    avatar: "/avatars/default.jpg",
  })

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
          "College Administrator"

        setUser({
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            name
          )}`,
        })
      } catch (fetchError) {
        console.error("Error fetching college admin user:", fetchError)
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
        title="College Admin"
        subtitle="Placement System"
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
              disabled={loading || refreshing}
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
