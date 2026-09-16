"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  IconLoader,
  IconAlertCircle,
  IconRefresh,
  IconDashboard,
  IconSchool,
  IconBuilding,
  IconBriefcase,
  IconLifebuoy,
  IconSend,
  IconUser,
  IconBell,
} from "@tabler/icons-react"

function CollegeAdminDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const {
    loading,
    refreshing,
    error,
    fetchData,
    orgStatus,
    notifications
  } = useCollegeAdmin()
  const [user, setUser] = React.useState({
      name: "Loading...",
      email: "",
      avatar: "/avatars/default.jpg",
    })
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
              "College Administrator"
    
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navMains = [
        {
          title: "Dashboard Overview",
          url: "/college-admin",
          icon: <IconDashboard className="size-4" />,
          isActive: true,
        },
        {
          title: "Departments",
          url: "/college-admin/departments",
          icon: <IconSchool className="size-4" />,
        },
        {
          title: "Onboarding Invites",
          url: "/college-admin/invites",
          icon: <IconBuilding className="size-4" />,
        },
        {
          title: "Mentor Approvals",
          url: "/college-admin/mentors",
          icon: <IconUser className="size-4" />,
        },
        {
          title: "Job Approvals",
          url: "/college-admin/jobs",
          icon: <IconBriefcase className="size-4" />,
        },
        {
          title: "Student Roster",
          url: "/college-admin/students",
          icon: <IconUser className="size-4" />,
        }
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
        navMain={navMains}
        navSecondary={navSecondary}
        user={user}
        func={handleLogout} />
      <SidebarInset>
        {/* Header navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 dark:border-secondary px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">College Admin</BreadcrumbLink>
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
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg border border-secondary text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 dark:border-secondary dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <IconRefresh className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">

          {orgStatus !== "ACTIVE" && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
              <IconAlertCircle className="h-5 w-5 shrink-0" />

              <div>
                <p className="font-bold">
                  Your college administration account is pending approval
                </p>

                <p className="mt-0.5 text-xs">
                  Your dashboard features are restricted.
                  You can browse, but cannot create departments, generate onboarding invite tokens, or approve job mappings until the Super Admin verifies your institute registration.
                </p>
              </div>
            </div>
          )}
          {/* Error Box */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              <IconAlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to load data</p>
                <p className="text-xs opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
              <IconLoader className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-zinc-500 font-medium">Fetching college details...</span>
            </div>
          ) : (
            <>
              {/* Tabs bar */}
              {/* <div className="flex items-center gap-1.5 border-b border-secondary dark:border-secondary">
                <Link
                  href="/college-admin/departments"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/college-admin/departments"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Departments
                </Link>
                <Link
                  href="/college-admin/invites"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/college-admin/invites"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Onboarding Invites
                </Link>
                <Link
                  href="/college-admin/jobs"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/college-admin/jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Job Approvals
                </Link>
                <Link
                  href="/college-admin/students"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/college-admin/students"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Student Roster
                </Link>
              </div> */}

              {children}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function CollegeAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <CollegeAdminProvider>
      <CollegeAdminDashboardShell>{children}</CollegeAdminDashboardShell>
    </CollegeAdminProvider>
  )
}
