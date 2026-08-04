"use client"

import * as React from "react"
import { useCollegeAdmin } from "./college-admin-context"
import Link from "next/link"
import {
  IconSchool,
  IconBuilding,
  IconBriefcase,
  IconCheck,
  IconX,
  IconUsers,
  IconArrowRight,
  IconTicket,
  IconAward,
  IconPlus,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function CollegeAdminRootPage() {
  const {
    departments,
    invites,
    jobMappings,
    students,
    mentors,
    orgStatus,
    isOrgActive,
    deptName,
    setDeptName,
    handleCreateDept,
  } = useCollegeAdmin()

  // Calculate placement stats
  const placementStats = React.useMemo(() => {
    const total = students.length
    const placed = students.filter(s => s.is_placed).length
    const rate = total > 0 ? Math.round((placed / total) * 100) : 0
    return { total, placed, rate }
  }, [students])

  // Count pending items
  const pendingJobsCount = React.useMemo(() => {
    return jobMappings.filter(m => m.local_status === "PENDING").length
  }, [jobMappings])

  const pendingMentorsCount = React.useMemo(() => {
    return mentors.filter(m => m.profile_status === "PENDING").length
  }, [mentors])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Premium Apple-style Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            College Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage department structures, generate onboarding invitation links, and review recruitment drives.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              orgStatus === "ACTIVE"
                ? "default"
                : orgStatus === "REJECTED"
                ? "destructive"
                : "secondary"
            }
            className="px-3 py-1.5 font-semibold text-xs tracking-wide"
          >
            {orgStatus === "ACTIVE" ? "ACTIVE / APPROVED" : orgStatus}
          </Badge>
        </div>
      </div>

      {/* Pending Items Callout alert */}
      {(pendingJobsCount > 0 || pendingMentorsCount > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 flex flex-col md:flex-row items-center gap-4 text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/20 dark:text-amber-400">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-500">
            <IconBriefcase className="h-6 w-6 animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base font-bold">Action Required: Pending Approvals</h3>
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-500 leading-relaxed">
              You currently have <span className="font-bold">{pendingJobsCount} job postings</span> and <span className="font-bold">{pendingMentorsCount} mentor profiles</span> awaiting admin verification and approval before they can activate.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {pendingJobsCount > 0 && (
              <Button variant="outline" size="sm" className="border-amber-200 text-amber-800 bg-background dark:border-amber-900/60 dark:text-amber-300 dark:bg-zinc-900 shrink-0">
                <Link href="/college-admin/jobs">Approve Jobs</Link>
              </Button>
            )}
            {pendingMentorsCount > 0 && (
              <Button variant="outline" size="sm" className="border-amber-200 text-amber-800 bg-background dark:border-amber-900/60 dark:text-amber-300 dark:bg-zinc-900 shrink-0">
                <Link href="/college-admin/mentors">Review Mentors</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main KPI Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Placement rate */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placement Rate</span>
              <IconAward className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {placementStats.rate}%
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {placementStats.placed} of {placementStats.total} Hired
            </p>
          </CardContent>
        </Card>

        {/* Total Departments */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Departments</span>
              <IconSchool className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {departments.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Registered branches
            </p>
          </CardContent>
        </Card>

        {/* Student Roster */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student Roster</span>
              <IconUsers className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {students.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Active candidates
            </p>
          </CardContent>
        </Card>

        {/* Faculty Mentors */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faculty Mentors</span>
              <IconUsers className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {mentors.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Assigned advisors
            </p>
          </CardContent>
        </Card>

        {/* Job mappings */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drive Mappings</span>
              <IconBriefcase className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {jobMappings.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Total campus drives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Quick Department Builder & Invite metrics */}
        <div className="space-y-6">
          {/* Quick Department creation */}
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IconPlus className="h-4 w-4 text-zinc-400" /> Quick Add Department
              </CardTitle>
              <CardDescription className="text-xs">Establish a new branch under your institute.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateDept} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. Computer Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-secondary px-3 text-xs focus:outline-primary dark:border-secondary dark:bg-zinc-900"
                  required
                />
                <Button type="submit" size="sm" className="w-full h-8 text-xs cursor-pointer">
                  Add Department
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Onboarding stats */}
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <IconTicket className="h-4 w-4 text-zinc-400" /> Onboarding Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs border-b pb-2">
                <span className="text-muted-foreground font-medium">Active Links</span>
                <span className="font-bold text-zinc-950 dark:text-zinc-50">{invites.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b pb-2">
                <span className="text-muted-foreground font-medium">Invited Registrations</span>
                <span className="font-bold text-zinc-950 dark:text-zinc-50">
                  {invites.reduce((sum, item) => sum + item.used_count, 0)}
                </span>
              </div>
              <div className="pt-2">
                <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground hover:text-foreground">
                  <Link href="/college-admin/invites" className="flex items-center gap-1 justify-center">
                    Manage Invite Tokens <IconArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Departments overview list */}
        <div className="md:col-span-2 space-y-6">
          {/* Placement performance progression bar */}
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Placement Progress Goal</CardTitle>
              <CardDescription className="text-xs">Real-time candidate placement execution progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Current Placement Rate: {placementStats.rate}%</span>
                <span className="text-muted-foreground">{placementStats.placed} of {placementStats.total} candidates hired</span>
              </div>
              <Progress value={placementStats.rate} className="h-2.5" />
            </CardContent>
          </Card>

          {/* Department List Roster */}
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Department Branches Status</CardTitle>
                <CardDescription className="text-xs">Current branches and eligibility statuses.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {departments.length} Branches
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <IconSchool className="h-10 w-10 stroke-[1.2] mb-1" />
                  <p className="text-sm font-semibold">No departments created yet</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">Use the Quick Add tool to generate branches.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {departments.slice(0, 5).map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all text-xs">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{dept.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Established: {new Date(dept.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge
                        variant={dept.status === "ACTIVE" ? "default" : "secondary"}
                        className="uppercase text-[9px] font-bold"
                      >
                        {dept.status}
                      </Badge>
                    </div>
                  ))}
                  {departments.length > 5 && (
                    <div className="text-center py-3">
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                        <Link href="/college-admin/departments" className="flex items-center gap-1">
                          View all departments <IconArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
