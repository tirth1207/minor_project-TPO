"use client"

import * as React from "react"
import Link from "next/link"

import { useMentor } from "./mentor-context"

import {
  IconAlertCircle,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconRefresh,
  IconSchool,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function MentorRootPage() {
  const {
    students,
    loading,
    refreshing,
    error,
    fetchData,
  } = useMentor()

  /* -------------------------------------------------------
     Dashboard statistics
  ------------------------------------------------------- */

  const stats = React.useMemo(() => {
    const total = students.length

    const pending = students.filter(
      (student) => student.profile_status === "PENDING"
    ).length

    const approved = students.filter(
      (student) => student.profile_status === "APPROVED"
    ).length

    const rejected = students.filter(
      (student) => student.profile_status === "REJECTED"
    ).length

    const placed = students.filter(
      (student) => student.is_placed
    ).length

    const averageCgpa =
      total > 0
        ? students.reduce(
            (sum, student) =>
              sum + Number(student.cgpa || 0),
            0
          ) / total
        : 0

    const placementRate =
      total > 0
        ? Math.round((placed / total) * 100)
        : 0

    return {
      total,
      pending,
      approved,
      rejected,
      placed,
      averageCgpa,
      placementRate,
    }
  }, [students])

  /* -------------------------------------------------------
     Students shown on dashboard

     Pending first, then others.
  ------------------------------------------------------- */

  const dashboardStudents = React.useMemo(() => {
    return [...students]
      .sort((a, b) => {
        if (
          a.profile_status === "PENDING" &&
          b.profile_status !== "PENDING"
        ) {
          return -1
        }

        if (
          a.profile_status !== "PENDING" &&
          b.profile_status === "PENDING"
        ) {
          return 1
        }

        return a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [students])

  /* -------------------------------------------------------
     Loading
  ------------------------------------------------------- */

  if (loading) {
    return <DashboardSkeleton />
  }

  /* -------------------------------------------------------
     Error
  ------------------------------------------------------- */

  if (error) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <IconAlertCircle className="size-6 text-destructive" />
            </div>

            <h2 className="font-semibold">
              Failed to load dashboard
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={() => fetchData(true)}
            >
              <IconRefresh className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          Header
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mentor Dashboard
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Review students, verify profiles and track placement
            progress.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <IconRefresh
            className={`size-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* =====================================================
          Main statistics
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.total}
          description="Students in your department"
          icon={<IconUsers />}
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          description={
            stats.pending === 0
              ? "No profiles awaiting review"
              : `${stats.pending} profile${
                  stats.pending === 1 ? "" : "s"
                } require review`
          }
          icon={<IconClock />}
          important={stats.pending > 0}
        />

        <StatCard
          title="Approved Profiles"
          value={stats.approved}
          description="Verified student profiles"
          icon={<IconCheck />}
        />

        <StatCard
          title="Placed Students"
          value={stats.placed}
          description={`${stats.placementRate}% placement rate`}
          icon={<IconBriefcase />}
        />
      </div>

      {/* =====================================================
          Secondary overview
      ====================================================== */}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Verification overview */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Profile Verification
            </CardTitle>

            <CardDescription>
              Current verification state of department students.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <OverviewMetric
                label="Approved"
                value={stats.approved}
                total={stats.total}
              />

              <OverviewMetric
                label="Pending"
                value={stats.pending}
                total={stats.total}
              />

              <OverviewMetric
                label="Rejected"
                value={stats.rejected}
                total={stats.total}
              />
            </div>

            <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-muted">
              {stats.total > 0 && (
                <>
                  <div
                    className="bg-foreground"
                    style={{
                      width: `${
                        (stats.approved / stats.total) * 100
                      }%`,
                    }}
                  />

                  <div
                    className="bg-muted-foreground/40"
                    style={{
                      width: `${
                        (stats.pending / stats.total) * 100
                      }%`,
                    }}
                  />

                  <div
                    className="bg-destructive"
                    style={{
                      width: `${
                        (stats.rejected / stats.total) * 100
                      }%`,
                    }}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Academic overview */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Academic Overview
            </CardTitle>

            <CardDescription>
              Department student performance.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Average CGPA
                </span>

                <IconTrendingUp className="size-4 text-muted-foreground" />
              </div>

              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {stats.averageCgpa.toFixed(2)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Out of 10.00
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Placement Rate
                </span>

                <span className="font-semibold">
                  {stats.placementRate}%
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{
                    width: `${stats.placementRate}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {stats.placed} of {stats.total} students placed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          Students table
      ====================================================== */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              Students
            </CardTitle>

            <CardDescription className="mt-1">
              Pending profiles are prioritised for review.
            </CardDescription>
          </div>

          <Button variant="outline" size="sm" >
            <Link href="/mentor/students" className="flex items-center gap-2">
              View all
              <IconArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent>
          {dashboardStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <IconSchool className="size-6 text-muted-foreground" />
              </div>

              <p className="font-medium">
                No students found
              </p>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Students assigned to your department will appear
                here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Backlogs</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Placement</TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {dashboardStudents.map((student) => (
                    <TableRow key={student.id}>
                      {/* Student */}

                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {student.name}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {student.enrollment_no}
                          </p>
                        </div>
                      </TableCell>

                      {/* Branch */}

                      <TableCell>
                        <span className="text-sm">
                          {student.branch}
                        </span>
                      </TableCell>

                      {/* Semester */}

                      <TableCell>
                        Sem {student.semester}
                      </TableCell>

                      {/* CGPA */}

                      <TableCell>
                        <span className="font-medium">
                          {Number(student.cgpa).toFixed(2)}
                        </span>
                      </TableCell>

                      {/* Backlogs */}

                      <TableCell>
                        {student.active_backlogs === 0 ? (
                          <span className="text-muted-foreground">
                            0
                          </span>
                        ) : (
                          <Badge variant="destructive">
                            {student.active_backlogs}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Profile status */}

                      <TableCell>
                        <ProfileStatusBadge
                          status={student.profile_status}
                        />
                      </TableCell>

                      {/* Placement */}

                      <TableCell>
                        {student.is_placed ? (
                          <Badge>
                            <IconBriefcase className="size-3" />
                            Placed
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Unplaced
                          </Badge>
                        )}
                      </TableCell>

                      {/* Action */}

                      <TableCell className="text-right">
                        <Button
                          variant={
                            student.profile_status === "PENDING"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                        >
                          <Link
                            href={`/mentor/students?student=${student.id}`}
                          >
                            {student.profile_status === "PENDING"
                              ? "Review"
                              : "View"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* =========================================================
   Stat Card
========================================================= */

function StatCard({
  title,
  value,
  description,
  icon,
  important = false,
}: {
  title: string
  value: number
  description: string
  icon: React.ReactElement
  important?: boolean
}) {
  return (
    <Card>
      <CardContent className="mt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>

          <div
            className={`flex size-10 items-center justify-center rounded-lg ${
              important
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {React.cloneElement(
              icon as React.ReactElement<{
                className?: string
              }>,
              {
                className: "size-5",
              }
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   Verification metric
========================================================= */

function OverviewMetric({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage =
    total > 0
      ? Math.round((value / total) * 100)
      : 0

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <div className="mt-1 flex items-end gap-2">
        <p className="text-2xl font-semibold">
          {value}
        </p>

        <p className="pb-0.5 text-xs text-muted-foreground">
          {percentage}%
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   Status Badge
========================================================= */

function ProfileStatusBadge({
  status,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED"
}) {
  if (status === "APPROVED") {
    return (
      <Badge>
        <IconCheck className="size-3" />
        Approved
      </Badge>
    )
  }

  if (status === "REJECTED") {
    return (
      <Badge variant="destructive">
        Rejected
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      <IconClock className="size-3" />
      Pending
    </Badge>
  )
}

/* =========================================================
   Loading skeleton
========================================================= */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item}>
            <CardContent className="pt-6">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-3 w-36 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="h-48 animate-pulse" />
        </Card>

        <Card>
          <CardContent className="h-48 animate-pulse" />
        </Card>
      </div>

      <Card>
        <CardContent className="h-80 animate-pulse" />
      </Card>
    </div>
  )
}