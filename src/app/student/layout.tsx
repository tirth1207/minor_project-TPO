"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { StudentProvider, useStudent } from "./student-context"
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
  IconBrain,
  IconBriefcase,
  IconCircleCheck,
  IconDashboard,
  IconExclamationCircle,
  IconFileCertificate,
  IconLifebuoy,
  IconLoader,
  IconRefresh,
  IconRobot,
  IconSend,
  IconSettings,
  IconUser,
} from "@tabler/icons-react"

function StudentDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const {
    loading,
    refreshing,
    error,
    profile,
    fetchData,
  } = useStudent()

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
          return
        }

        const data = await res.json()
        const email = data.user?.email ?? ""
        const name =
          data.studentProfile?.name ||
          email.split("@")[0] ||
          "Student Candidate"

        setUser({
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            name
          )}`,
        })
      } catch (error) {
        console.error("Error fetching student user:", error)
      }
    }

    fetchUser()
  }, [])

  React.useEffect(() => {
    if (
      !loading &&
      profile &&
      profile.profile_status !== "APPROVED" &&
      pathname !== "/student/profile"
    ) {
      router.replace("/student/profile")
    }
  }, [loading, pathname, profile, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const studentNavMains = React.useMemo(
    () => [
      {
        title: "Dashboard Overview",
        url: "/student/dashboard",
        icon: <IconDashboard className="size-4" />,
        isActive: pathname === "/student/dashboard",
      },
      {
        title: "Eligible Jobs",
        url: "/student/jobs",
        icon: <IconBriefcase className="size-4" />,
        isActive: pathname === "/student/jobs",
      },
      {
        title: "My Applications",
        url: "/student/applications",
        icon: <IconFileCertificate className="size-4" />,
        isActive: pathname === "/student/applications",
      },
      {
        title: "Interview Prep & Mocks",
        url: "/student/mock",
        icon: <IconRobot className="size-4" />,
        isActive: pathname?.startsWith("/student/mock"),
      },
      {
        title: "AI Career Roadmap",
        url: "/student/roadmap",
        icon: <IconBrain className="size-4" />,
        isActive: pathname === "/student/roadmap",
      },
      {
        title: "Candidate Profile",
        url: "/student/profile",
        icon: <IconUser className="size-4" />,
        isActive: pathname === "/student/profile",
      },
      {
        title: "Help",
        url: "/student/settings",
        icon: <IconSettings className="size-4" />,
        isActive: pathname === "/student/settings",
        items: [
          {
            title: "Support",
            url: "/support",
          },
          {
            title: "Feedback",
            url: "/feedback",
          },
        ],
      },
    ],
    [pathname]
  )

  const currentPage =
    pathname === "/student/dashboard"
      ? "Dashboard Overview"
      : pathname === "/student/profile"
        ? "Candidate Profile"
        : pathname === "/student/jobs"
          ? "Eligible Jobs"
          : pathname === "/student/applications"
            ? "My Applications"
            : pathname === "/student/roadmap"
              ? "AI Career Roadmap"
              : pathname === "/student/settings"
                ? "Career Preferences"
                : "Interview Prep"

  return (
    <SidebarProvider>
      <AppSidebar
        title="Student Portal"
        subtitle="Placement System"
        navMain={studentNavMains}
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
                  <BreadcrumbLink href="/student/dashboard">
                    Student Portal
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
              className="cursor-pointer rounded-lg border border-secondary p-1.5 text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50 dark:border-secondary dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              title="Refresh Data"
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
                Loading student portal...
              </span>
            </div>
          ) : (
            <>
              {profile && profile.profile_status !== "APPROVED" && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/45 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                  <IconExclamationCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Your profile is currently PENDING verification
                    </p>
                    <p className="mt-0.5 text-xs">
                      Your job application capabilities are locked. Please
                      contact your Faculty Mentor to verify your candidate
                      credentials.
                    </p>
                  </div>
                </div>
              )}

              {profile && profile.is_placed && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/45 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <IconCircleCheck className="h-5 w-5 shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold">
                      Congratulations! You have been successfully placed.
                    </p>
                    <p className="mt-0.5 text-xs">
                      Your placement drive process is completed. Best wishes for
                      your career.
                    </p>
                  </div>
                </div>
              )}

              {children}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudentProvider>
      <StudentDashboardShell>{children}</StudentDashboardShell>
    </StudentProvider>
  )
}
