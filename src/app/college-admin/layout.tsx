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
  // Keep the dashboard shell mounted and visible after the first successful load.
  // Background auth/data changes must never replace the existing page with a full loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading || collegeAdminLoading) {
      setHasLoadedOnce(true)
    }
  }, [authLoading || collegeAdminLoading])