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
  // Keep the dashboard shell mounted and visible after the first successful load.
  // Background auth/data changes must never replace the existing page with a full loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading || mentorLoading) {
      setHasLoadedOnce(true)
    }
  }, [authLoading || mentorLoading])