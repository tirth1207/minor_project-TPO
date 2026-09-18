"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/providers/auth-provider"
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
  IconChartBar,
  IconCircleCheck,
  IconDashboard,
  IconExclamationCircle,
  IconFileCertificate,
  IconGift,
  IconLoader,
  IconRefresh,
  IconRobot,
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
  const { user: authUser, loading: authLoading, signOut } = useAuth()

  const {
    loading: studentLoading,
    refreshing,
    error,
    profile,
    fetchData,
  } = useStudent()

  const sidebarUser = React.useMemo(() => {
    const name = authUser?.name || "Student Candidate"
    const email = authUser?.email || ""
    const avatar = authUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
    return { name, email, avatar }
  }, [authUser])

  React.useEffect(() => {
    // Only redirect if student provider has loaded and profile status is verified
    if (
      !authLoading &&
      !studentLoading &&
      profile &&
      profile.profile_status !== "APPROVED" &&
      pathname !== "/student/profile"
    ) {
      router.replace("/student/profile")
    }
  }, [authLoading, studentLoading, pathname, profile, router])

  const handleLogout = async () => {
    await signOut()
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
        title: "Job Offers",
        url: "/student/offers",
        icon: <IconGift className="size-4" />,
        isActive: pathname === "/student/offers",
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
        title: "Career Analytics",
        url: "/student/analytics",
        icon: <IconChartBar className="size-4" />,
        isActive: pathname === "/student/analytics",
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
            : pathname === "/student/offers"
              ? "Job Offers"
              : pathname === "/student/roadmap"
              ? "AI Career Roadmap"
              : pathname === "/student/analytics"
                ? "Career Analytics"
                : pathname === "/student/settings"
                  ? "Career Preferences"
                  : "Interview Prep"

  const isLoading = authLoading || studentLoading
  // Keep the dashboard shell mounted and visible after the first successful load.
  // Background auth/data changes must never replace the existing page with a full loader.
  const [hasLoadedOnce, setHasLoadedOnce] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading || studentLoading) {
      setHasLoadedOnce(true)
    }
  }, [authLoading || studentLoading])