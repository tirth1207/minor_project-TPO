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
  // Keep the dashboard shell mounted and visible after the first successful load.
  // Background auth/data changes must never replace the existing page with a full loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading || superAdminLoading) {
      setHasLoadedOnce(true)
    }
  }, [authLoading || superAdminLoading])