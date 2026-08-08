"use client"

import * as React from "react"
import { useStudent } from "../student-context"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconAward,
  IconBriefcase,
  IconClock,
  IconFileCertificate,
  IconLayoutDashboard,
  IconRobot,
  IconTrendingUp,
  IconUser,
  IconChevronRight,
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default function StudentDashboardPage() {
  const {
    profile,
    jobs,
    applications,
  } = useStudent()

  // Calculate profile completion percentage based on filled details
  const profileCompletion = React.useMemo(() => {
    if (!profile) return 0
    let fields = 0
    let filled = 0

    const checkField = (val: any) => {
      fields++
      if (val !== null && val !== undefined && val !== "" && (Array.isArray(val) ? val.length > 0 : true)) {
        filled++
      }
    }

    checkField(profile.name)
    checkField(profile.enrollment_no)
    checkField(profile.dob)
    checkField(profile.phone)
    checkField(profile.address)
    checkField(profile.bio)
    checkField(profile.cgpa)
    checkField(profile.branch)
    checkField(profile.skills)
    checkField(profile.resume_url)
    checkField(profile.marksheet_url)
    checkField(profile.social_links && Object.keys(profile.social_links).length > 0)

    return Math.round((filled / fields) * 100)
  }, [profile])

  if (!profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Student profile not found.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Premium Apple-style Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <IconLayoutDashboard className="h-6 w-6 text-zinc-500" />
            Welcome back, {profile.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.branch} • Enrollment No: {profile.enrollment_no}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              profile.is_placed
                ? "default"
                : "secondary"
            }
            className="px-3 py-1.5 font-semibold text-xs tracking-wide"
          >
            {profile.is_placed ? "Hired & Placed ✓" : "Actively Sourcing"}
          </Badge>
        </div>
      </div>

      {/* Placement Status Callout Banner */}
      {profile.is_placed ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 flex flex-col md:flex-row items-center gap-4 text-emerald-800 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-500">
            <IconAward className="h-6 w-6" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base font-bold">You are placed! 🎉</h3>
            <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-500">
              Congratulations! Your college placement registration has been successfully locked because you accepted a campus recruitment drive offer.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-800 bg-background dark:border-emerald-900/60 dark:text-emerald-300 dark:bg-zinc-900 shrink-0">
            <Link href="/student/applications">View Offer</Link>
          </Button>
        </div>
      ) : profile.profile_status === "PENDING" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 flex flex-col md:flex-row items-center gap-4 text-amber-800 dark:border-amber-950/40 dark:bg-amber-950/20 dark:text-amber-400 animate-pulse">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-emerald-500">
            <IconClock className="h-6 w-6" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base font-bold">Verification Pending</h3>
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-500">
              Your profile is currently awaiting review and verification from your faculty mentor. Once approved, you will automatically unlock eligible campus placement opportunities.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-amber-200 text-amber-800 bg-background dark:border-amber-900/60 dark:text-amber-300 dark:bg-zinc-900 shrink-0">
            <Link href="/student/profile">Review Fields</Link>
          </Button>
        </div>
      ) : null}

      {/* Main KPI Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Profile Status */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Status</span>
              <IconUser className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-lg font-bold">
              {profile.profile_status}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {profile.profile_status === "APPROVED" ? "Eligible for drives" : "Awaiting approval"}
            </p>
          </CardContent>
        </Card>

        {/* CGPA */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic CGPA</span>
              <IconTrendingUp className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {Number(profile.cgpa).toFixed(2)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              On 10.00 Max scale
            </p>
          </CardContent>
        </Card>

        {/* Backlogs */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Backlogs</span>
              <IconAlertTriangle className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {profile.active_backlogs}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {profile.active_backlogs === 0 ? "Perfect record ✓" : "Exceeds some requirements"}
            </p>
          </CardContent>
        </Card>

        {/* Applications Sent */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Applied Drives</span>
              <IconFileCertificate className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {applications.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Total submissions
            </p>
          </CardContent>
        </Card>

        {/* Available Job Matches */}
        <Card className="shadow-none border-secondary dark:border-secondary">
          <CardContent className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Job Matches</span>
              <IconBriefcase className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-50">
              {jobs.length}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Active open roles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completion and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Profile Completion & Quick Links */}
        <div className="space-y-6">
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Profile Completion</CardTitle>
              <CardDescription className="text-xs">Ensure your details are up to date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{profileCompletion}% Complete</span>
                <span className="text-muted-foreground">{profileCompletion === 100 ? "Ready!" : "Missing details"}</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
              <p className="text-[10px] text-muted-foreground leading-normal">
                Faculty mentors can only approve accurate, fully-completed profiles. Keeping your resume and marksheet updated maximizes eligible matches.
              </p>
            </CardContent>
          </Card>

          {/* Quick Workspace Nav */}
          <Card className="shadow-none border-secondary dark:border-secondary">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold">Quick Workspace</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                <Link
                  href="/student/profile"
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                    <IconUser className="h-4 w-4 text-zinc-400" /> Complete Resume & Details
                  </span>
                  <IconChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/student/jobs"
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:bg-zinc-900 transition-all text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                    <IconBriefcase className="h-4 w-4" /> Browse Campus Job Openings
                  </span>
                  <IconChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/student/mock"
                  className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:bg-zinc-900 transition-all text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
                    <IconRobot className="h-4 w-4" /> Practice AI Mock Interviews
                  </span>
                  <IconChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Recent applications status */}
        <div className="md:col-span-2">
          <Card className="shadow-none border-secondary dark:border-secondary h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Drive Submissions & Hiring Funnel</CardTitle>
                <CardDescription className="text-xs">Real-time status updates of your applications.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {applications.length} Submitted
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                  <IconFileCertificate className="h-10 w-10 stroke-[1.2] mb-2" />
                  <p className="text-sm font-semibold">No applications submitted yet</p>
                  <p className="text-xs mt-1 text-muted-foreground max-w-xs">
                    Once you apply for eligible drives, their progress rounds, mock scores, and offers will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((app) => {
                    const job = app.job_college_mapping?.job
                    if (!job) return null

                    // const activeOffer = app.offers?.find(
                    //   (o) => o.status === "EXTENDED"
                    // )

                    // const acceptedOffer = app.offers?.find(
                    //   (o) => o.status === "ACCEPTED"
                    // )

                    return (
                      <div
                        key={app.id}
                        className="p-4 rounded-xl border border-secondary bg-zinc-50/20 dark:bg-zinc-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-sm transition-all"
                      >
                        {/* your existing content */}
                      </div>
                    )
                  })}

                  {applications.length > 5 && (
                    <div className="text-center pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Link
                          href="/student/applications"
                          className="flex items-center gap-1"
                        >
                          View all applications
                          <IconChevronRight className="h-3 w-3" />
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