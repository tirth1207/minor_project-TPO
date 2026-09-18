"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { MentorProvider, useMentor } from "./mentor-context"
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
  IconBuilding,
  IconLifebuoy,
  IconSend,
  IconDatabaseSearch,
  IconSettings,
} from "@tabler/icons-react"

const navMains = [
    {
      title: "Dashboard",
      url: "/mentor",
      icon: <IconDashboard className="size-4" />,
    },
    {
      title: "Insights",
      url: "/mentor/insights",
      icon: <IconDatabaseSearch className="size-4" />,
    },
    {
      title: "Student Approvals",
      url: "/mentor/students",
      icon: <IconBuilding className="size-4" />,
    },
    {
      title: "Settings",
      url: "/mentor/settings",
      icon: <IconSettings className="size-4" />,
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

function MentorDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user: authUser, loading: authLoading, signOut } = useAuth()
  const {
    loading: mentorLoading,
    refreshing,
    error,
    filterStatus,
    setFilterStatus,
    fetchData,
  } = useMentor()

  const sidebarUser = React.useMemo(() => {
    const name = authUser?.name || "Faculty Mentor"
    const email = authUser?.email || ""
    const avatar = authUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    return { name, email, avatar }
  }, [authUser])

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const isLoading = authLoading || mentorLoading

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
        title="Faculty Mentor"
        subtitle="Verification Dashboard"
        user={sidebarUser}
        navMain={navMains}
        navSecondary={navSecondary}
        func={handleLogout}
        />
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
                  <BreadcrumbLink href="/mentor">Faculty Mentor</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Verification Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border border-secondary text-xs font-semibold px-2 focus:outline-primary dark:border-secondary dark:bg-zinc-900"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Verification</option>
              <option value="APPROVED">Approved Profiles</option>
              <option value="REJECTED">Rejected Profiles</option>
            </select>
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || refreshing}
              className="p-1.5 rounded-lg border border-secondary text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 dark:border-secondary dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <IconRefresh className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
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

          {isLoading && !hasLoadedOnce ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
              <IconLoader className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-zinc-500 font-medium">Fetching assigned recruits...</span>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <MentorProvider>
      <MentorDashboardShell>{children}</MentorDashboardShell>
    </MentorProvider>
  )
}
