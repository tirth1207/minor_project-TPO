"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
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
  IconLoader,
  IconAlertCircle,
  IconRefresh,
  IconSchool,
  IconBuilding,
  IconBriefcase,
  IconUsers,
} from "@tabler/icons-react"

function SuperAdminDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const {
    loading,
    refreshing,
    error,
    stats,
    fetchData,
  } = useSuperAdmin()

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
                  <BreadcrumbLink href="#">Super Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
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
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all cursor-pointer"
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
              <span className="text-sm text-zinc-500 font-medium">Fetching platform data...</span>
            </div>
          ) : (
            <>
              {/* Dashboard Tabs bar */}
              <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <Link
                  href="/super-admin/overview"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/super-admin/overview"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/super-admin/colleges"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/super-admin/colleges"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Colleges
                </Link>
                <Link
                  href="/super-admin/companies"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/super-admin/companies"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Companies
                </Link>
                <Link
                  href="/super-admin/jobs"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/super-admin/jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Job Postings
                </Link>
              </div>

              {/* Stat Summary Cards */}
              {stats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Stat 1 */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Colleges</span>
                      <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.organizations.total}</h3>
                      <span className="text-xs text-zinc-500 mt-0.5 block">{stats.organizations.pending} pending approval</span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                      <IconSchool className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Companies</span>
                      <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.companies.total}</h3>
                      <span className="text-xs text-zinc-500 mt-0.5 block">{stats.companies.pending} pending registration</span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                      <IconBuilding className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Stat 3 */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Job Postings</span>
                      <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.jobs.total}</h3>
                      <span className="text-xs text-zinc-500 mt-0.5 block">{stats.jobs.pending} pending global approval</span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                      <IconBriefcase className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Stat 4 */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placements</span>
                      <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">
                        {stats.students.total > 0
                          ? `${Math.round((stats.students.placed / stats.students.total) * 100)}%`
                          : "0%"
                        }
                      </h3>
                      <span className="text-xs text-zinc-500 mt-0.5 block">{stats.students.placed} of {stats.students.total} placed</span>
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                      <IconUsers className="h-6 w-6" />
                    </div>
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

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminProvider>
      <SuperAdminDashboardShell>{children}</SuperAdminDashboardShell>
    </SuperAdminProvider>
  )
}
