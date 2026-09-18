"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/providers/auth-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { CompanyProvider, useCompany } from "./company-context"

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
  IconChartArea,
  IconLifebuoy,
  IconLoader,
  IconRefresh,
  IconSend,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

function CompanyDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user: authUser, loading: authLoading, signOut } = useAuth()

  const {
    loading: companyLoading,
    refreshing,
    error,
    companyStatus,
    fetchData,
  } = useCompany()

  const sidebarUser = React.useMemo(() => {
    const name = authUser?.companyProfile?.company_name || authUser?.name || "Corporate Partner"
    const email = authUser?.email || ""
    const avatar = authUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    return { name, email, avatar }
  }, [authUser])

  const handleLogout = async () => {
    try {
      await signOut()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const navMain = [
    {
      title: "Dashboard",
      url: "/company",
      icon: <IconChartArea className="size-4" />,
      isActive:
        pathname === "/company" || pathname.startsWith("/company"),
    },
    {
      title: "Posted Jobs",
      url: "/company/jobs",
      icon: <IconBriefcase className="size-4" />,
      isActive:
        pathname === "/company/jobs" ||
        pathname.startsWith("/company/jobs/"),
    },
    {
      title: "Review Applicants",
      url: "/company/applicants",
      icon: <IconUsers className="size-4" />,
      isActive:
        pathname === "/company/applicants" ||
        pathname.startsWith("/company/applicants/"),
    },
    {
      title: "Settings",
      url: "/company/settings",
      icon: <IconSettings className="size-4" />,
      isActive: pathname.startsWith("/company/settings"),
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

  const currentPage =
    navMain.find((item) => item.isActive)?.title ?? "Dashboard"

  const isLoading = authLoading || companyLoading
  // Keep the dashboard shell mounted and visible after the first successful load.
  // Background auth/data changes must never replace the existing page with a full loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading || companyLoading) {
      setHasLoadedOnce(true)
    }
  }, [authLoading || companyLoading])