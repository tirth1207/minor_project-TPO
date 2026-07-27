"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppSidebar } from "@/components/app-sidebar"
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
  IconLoader,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react"

function CompanyDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const {
    loading,
    refreshing,
    error,
    companyStatus,
    fetchData,
  } = useCompany()

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
                  <BreadcrumbLink href="#">Corporate Partner</BreadcrumbLink>
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
          {/* Corporate status check alert */}
          {companyStatus !== "ACTIVE" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800 flex items-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
              <IconAlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Your corporate account is PENDING approval</p>
                <p className="text-xs mt-0.5">Your dashboard features are restricted. You can browse, but cannot publish new job postings until Super Admin verifies your corporate credentials.</p>
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
              <span className="text-sm text-zinc-500 font-medium">Fetching corporate panel...</span>
            </div>
          ) : (
            <>
              {/* Tabs bar */}
              <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <Link
                  href="/company/jobs"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/company/jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  My Job Postings
                </Link>
                <Link
                  href="/company/post-job"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/company/post-job"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Post New Opening
                </Link>
                <Link
                  href="/company/applicants"
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all capitalize ${
                    pathname === "/company/applicants"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Review Applicants
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

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <CompanyDashboardShell>{children}</CompanyDashboardShell>
    </CompanyProvider>
  )
}
