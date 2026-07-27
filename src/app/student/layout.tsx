"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
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
  IconLoader,
  IconAlertCircle,
  IconRefresh,
  IconUser,
  IconBriefcase,
  IconFileCertificate,
  IconRobot,
  IconExclamationCircle,
  IconCircleCheck,
} from "@tabler/icons-react"

function StudentDashboardShell({ children }: { children: React.ReactNode }) {
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Student Candidate</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Recruitment Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <IconRefresh className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all cursor-pointer"
            >
              Logout
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

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
              <IconLoader className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-zinc-500 font-medium">Loading candidate portal...</span>
            </div>
          ) : (
            <>
              {/* Dynamic status alert */}
              {profile && profile.profile_status !== "APPROVED" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-4 text-sm text-amber-800 flex items-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                  <IconExclamationCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Your profile is currently PENDING verification</p>
                    <p className="text-xs mt-0.5">Your dashboard application capabilities are locked. Please consult with your assigned Faculty Mentor to review and verify your candidate fields and credentials.</p>
                  </div>
                </div>
              )}

              {profile && profile.is_placed && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/45 p-4 text-sm text-emerald-800 flex items-center gap-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <IconCircleCheck className="h-5 w-5 shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold">Congratulations! You have been successfully PLACED 🎉</p>
                    <p className="text-xs mt-0.5">Your college placement process is completed. We wish you an amazing corporate career ahead!</p>
                  </div>
                </div>
              )}

              {/* Tabs bar (Folder routing) */}
              <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <Link
                  href="/student/profile"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/student/profile"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconUser className="h-4 w-4" /> Profile</span>
                </Link>
                <Link
                  href="/student/jobs"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/student/jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconBriefcase className="h-4 w-4" /> Eligible Jobs</span>
                </Link>
                <Link
                  href="/student/applications"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/student/applications"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconFileCertificate className="h-4 w-4" /> My Applications</span>
                </Link>
                <Link
                  href="/student/mock"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/student/mock"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconRobot className="h-4 w-4" /> AI Mock Prep</span>
                </Link>
              </div>

              {children}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentProvider>
      <StudentDashboardShell>{children}</StudentDashboardShell>
    </StudentProvider>
  )
}
