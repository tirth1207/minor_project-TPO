"use client"

import * as React from "react"
import Link from "next/link"

import { useMentor } from "../mentor-context"

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBook,
  IconBriefcase,
  IconChartBar,
  IconCircleCheck,
  IconClock,
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
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function MentorOverviewPage() {
  const { students } = useMentor()

  const insights = React.useMemo(() => {
    const total = students.length

    const approved = students.filter(
      (student) => student.profile_status === "APPROVED"
    ).length

    const pending = students.filter(
      (student) => student.profile_status === "PENDING"
    ).length

    const placed = students.filter(
      (student) => student.is_placed
    ).length

    const studentsWithBacklogs = students.filter(
      (student) => student.active_backlogs > 0
    ).length

    const highPerformers = students.filter(
      (student) => Number(student.cgpa) >= 8
    ).length

    const averageCgpa =
      total > 0
        ? students.reduce(
            (sum, student) =>
              sum + Number(student.cgpa || 0),
            0
          ) / total
        : 0

    const approvalRate =
      total > 0
        ? Math.round((approved / total) * 100)
        : 0

    const placementRate =
      approved > 0
        ? Math.round((placed / approved) * 100)
        : 0

    const backlogFree =
      total -
      studentsWithBacklogs

    const backlogFreeRate =
      total > 0
        ? Math.round((backlogFree / total) * 100)
        : 0

    return {
      total,
      approved,
      pending,
      placed,
      studentsWithBacklogs,
      highPerformers,
      averageCgpa,
      approvalRate,
      placementRate,
      backlogFree,
      backlogFreeRate,
    }
  }, [students])

  /* -------------------------------------------------------
     Semester distribution
  ------------------------------------------------------- */

  const semesterDistribution = React.useMemo(() => {
    const semesters = new Map<number, number>()

    students.forEach((student) => {
      semesters.set(
        student.semester,
        (semesters.get(student.semester) ?? 0) + 1
      )
    })

    return Array.from(semesters.entries())
      .map(([semester, count]) => ({
        semester,
        count,
        percentage:
          students.length > 0
            ? Math.round(
                (count / students.length) * 100
              )
            : 0,
      }))
      .sort(
        (a, b) => a.semester - b.semester
      )
  }, [students])

  /* -------------------------------------------------------
     Students requiring mentor attention
  ------------------------------------------------------- */

  const attentionStudents = React.useMemo(() => {
    return students
      .filter(
        (student) =>
          student.profile_status === "PENDING" ||
          student.active_backlogs > 0
      )
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

        return (
          b.active_backlogs -
          a.active_backlogs
        )
      })
      .slice(0, 6)
  }, [students])

  return (
    <div className="space-y-6">
      {/* Header */}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Student Insights
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Academic health, placement readiness and students
          requiring your attention.
        </p>
      </div>

      {/* Main metrics */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Average CGPA"
          value={insights.averageCgpa.toFixed(2)}
          description="Department average"
          icon={<IconTrendingUp />}
        />

        <InsightCard
          title="High Performers"
          value={insights.highPerformers}
          description="Students with 8.0+ CGPA"
          icon={<IconSchool />}
        />

        <InsightCard
          title="Backlog Free"
          value={insights.backlogFree}
          description={`${insights.backlogFreeRate}% of students`}
          icon={<IconCircleCheck />}
        />

        <InsightCard
          title="Need Attention"
          value={
            attentionStudents.length
          }
          description="Pending or backlog students"
          icon={<IconAlertTriangle />}
        />
      </div>

      {/* Readiness */}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconChartBar className="size-5" />
              Student Readiness
            </CardTitle>

            <CardDescription>
              Overview of profile verification, academics and
              placement progress.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-7">
            <ReadinessRow
              label="Profile Verification"
              value={insights.approvalRate}
              detail={`${insights.approved} of ${insights.total} approved`}
            />

            <ReadinessRow
              label="Backlog Free"
              value={insights.backlogFreeRate}
              detail={`${insights.backlogFree} of ${insights.total} students`}
            />

            <ReadinessRow
              label="Placement Progress"
              value={insights.placementRate}
              detail={`${insights.placed} of ${insights.approved} approved students placed`}
            />

            <ReadinessRow
              label="High Academic Performance"
              value={
                insights.total > 0
                  ? Math.round(
                      (insights.highPerformers /
                        insights.total) *
                        100
                    )
                  : 0
              }
              detail={`${insights.highPerformers} students have 8.0+ CGPA`}
            />
          </CardContent>
        </Card>

        {/* Mentor workload */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Mentor Workload
            </CardTitle>

            <CardDescription>
              Items currently requiring review.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <WorkloadItem
              icon={<IconClock />}
              label="Pending profiles"
              value={insights.pending}
            />

            <WorkloadItem
              icon={<IconAlertTriangle />}
              label="Students with backlogs"
              value={
                insights.studentsWithBacklogs
              }
            />

            <WorkloadItem
              icon={<IconBriefcase />}
              label="Not yet placed"
              value={
                insights.total -
                insights.placed
              }
            />

            <WorkloadItem
              icon={<IconUsers />}
              label="Total students"
              value={insights.total}
            />

            <Button
              className="mt-3 w-full"
            >
              <Link href="/mentor/students" className="flex items-center justify-center gap-2">
                Review Students
                <IconArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Semester distribution */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconBook className="size-5" />
            Semester Distribution
          </CardTitle>

          <CardDescription>
            Distribution of students across academic semesters.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {semesterDistribution.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              {semesterDistribution.map(
                ({
                  semester,
                  count,
                  percentage,
                }) => (
                  <div
                    key={semester}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Semester {semester}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {count}{" "}
                        {count === 1
                          ? "student"
                          : "students"}
                      </span>
                    </div>

                    <Progress
                      value={percentage}
                    />

                    <p className="text-xs text-muted-foreground">
                      {percentage}% of department
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attention required */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconAlertTriangle className="size-5" />
              Attention Required
            </CardTitle>

            <CardDescription className="mt-1">
              Students with pending verification or active
              backlogs.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
          >
            <Link href="/mentor/students" className="flex items-center justify-center gap-2">
              View Students
              <IconArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent>
          {attentionStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                <IconCircleCheck className="size-5 text-muted-foreground" />
              </div>

              <p className="text-sm font-medium">
                Everything looks good
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                No students currently require immediate
                attention.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Student
                    </TableHead>

                    <TableHead>
                      Semester
                    </TableHead>

                    <TableHead>
                      CGPA
                    </TableHead>

                    <TableHead>
                      Backlogs
                    </TableHead>

                    <TableHead>
                      Profile
                    </TableHead>

                    <TableHead className="text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {attentionStudents.map(
                    (student) => (
                      <TableRow
                        key={student.id}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {student.name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {
                                student.enrollment_no
                              }
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          Semester{" "}
                          {student.semester}
                        </TableCell>

                        <TableCell>
                          {Number(
                            student.cgpa
                          ).toFixed(2)}
                        </TableCell>

                        <TableCell>
                          {student.active_backlogs >
                          0 ? (
                            <Badge variant="destructive">
                              {
                                student.active_backlogs
                              }{" "}
                              active
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              None
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {student.profile_status ===
                          "PENDING" ? (
                            <Badge variant="secondary">
                              Pending
                            </Badge>
                          ) : student.profile_status ===
                            "APPROVED" ? (
                            <Badge>
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Link
                              href={`/mentor/students?student=${student.id}`}
                            >
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InsightCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactElement
}) {
  return (
    <Card>
      <CardContent className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
      </CardContent>
    </Card>
  )
}

function ReadinessRow({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {label}
          </p>

          <p className="text-xs text-muted-foreground">
            {detail}
          </p>
        </div>

        <span className="text-sm font-semibold">
          {value}%
        </span>
      </div>

      <Progress value={value} />
    </div>
  )
}

function WorkloadItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {React.cloneElement(
            icon as React.ReactElement<{
              className?: string
            }>,
            {
              className: "size-4",
            }
          )}
        </div>

        <span className="text-sm">
          {label}
        </span>
      </div>

      <span className="font-semibold">
        {value}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <IconSchool className="mx-auto size-8 text-muted-foreground" />

      <p className="mt-3 text-sm font-medium">
        No academic data available
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        Student semester information will appear here.
      </p>
    </div>
  )
}