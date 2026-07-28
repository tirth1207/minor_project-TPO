"use client"

import * as React from "react"
import {
  IconBook2,
  IconBriefcase,
  IconDotsVertical,
  IconSearch,
  IconUsers,
  IconUserCheck,
  IconClock as IconUserClock,
} from "@tabler/icons-react"

import { useCollegeAdmin } from "../college-admin-context"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type MentorStatus = "PENDING" | "APPROVED" | "REJECTED"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function getStatusBadge(status: MentorStatus) {
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="default">
          Approved
        </Badge>
      )

    case "REJECTED":
      return (
        <Badge variant="destructive">
          Rejected
        </Badge>
      )

    default:
      return (
        <Badge variant="secondary">
          Pending
        </Badge>
      )
  }
}

export default function MentorsPage() {
  const {
    mentors,
    loading,
    refreshing,
    handleUpdateMentorStatus,
  } = useCollegeAdmin()

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] =
    React.useState("ALL")
  const [departmentFilter, setDepartmentFilter] =
    React.useState("ALL")

  const departments = React.useMemo(() => {
    const map = new Map<string, string>()

    mentors.forEach((mentor) => {
      if (
        mentor.department?.id &&
        mentor.department.name
      ) {
        map.set(
          mentor.department.id,
          mentor.department.name
        )
      }
    })

    return Array.from(map.entries())
      .map(([id, name]) => ({
        id,
        name,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      )
  }, [mentors])

  const filteredMentors = React.useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    return mentors.filter((mentor) => {
      const matchesSearch =
        !query ||
        mentor.name
          .toLowerCase()
          .includes(query) ||
        mentor.employee_id
          .toLowerCase()
          .includes(query) ||
        mentor.designation
          ?.toLowerCase()
          .includes(query) ||
        mentor.specialization
          ?.toLowerCase()
          .includes(query) ||
        mentor.department?.name
          ?.toLowerCase()
          .includes(query)

      const matchesStatus =
        statusFilter === "ALL" ||
        mentor.profile_status === statusFilter

      const matchesDepartment =
        departmentFilter === "ALL" ||
        mentor.department?.id ===
          departmentFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment
      )
    })
  }, [
    mentors,
    search,
    statusFilter,
    departmentFilter,
  ])

  const approvedCount = React.useMemo(
    () =>
      mentors.filter(
        (mentor) =>
          mentor.profile_status === "APPROVED"
      ).length,
    [mentors]
  )

  const pendingCount = React.useMemo(
    () =>
      mentors.filter(
        (mentor) =>
          mentor.profile_status === "PENDING"
      ).length,
    [mentors]
  )

  const specializedCount = React.useMemo(
    () =>
      mentors.filter(
        (mentor) =>
          Boolean(mentor.specialization)
      ).length,
    [mentors]
  )

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loading mentors...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------
          Header
      -------------------------------------------------- */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mentors
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            View and manage mentors registered with
            your institute.
          </p>
        </div>

        {refreshing && (
          <Badge variant="secondary">
            Refreshing...
          </Badge>
        )}
      </div>

      {/* --------------------------------------------------
          Stats
      -------------------------------------------------- */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Mentors
            </CardTitle>

            <IconUsers className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {mentors.length}
            </div>

            <p className="text-xs text-muted-foreground">
              Registered mentors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved
            </CardTitle>

            <IconUserCheck className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {approvedCount}
            </div>

            <p className="text-xs text-muted-foreground">
              Active mentor profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending
            </CardTitle>

            <IconUserClock className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCount}
            </div>

            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Specialized
            </CardTitle>

            <IconBook2 className="size-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {specializedCount}
            </div>

            <p className="text-xs text-muted-foreground">
              With specialization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------------------
          Mentor table
      -------------------------------------------------- */}

      <Card>
        <CardHeader>
          <CardTitle>Mentor Directory</CardTitle>

          <CardDescription>
            Browse mentors across your institute and
            departments.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Search name, employee ID, specialization..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="pl-9"
              />
            </div>

            <Select
              value={departmentFilter}
              onValueChange={(value) => {
                setDepartmentFilter(value ?? "ALL")
            }}
            >
              <SelectTrigger className="w-full lg:w-[210px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">
                  All departments
                </SelectItem>

                {departments.map(
                  (department) => (
                    <SelectItem
                      key={department.id}
                      value={department.id}
                    >
                      {department.name}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setDepartmentFilter(value ?? "ALL")
            }}
            >
              <SelectTrigger className="w-full lg:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">
                  All statuses
                </SelectItem>

                <SelectItem value="APPROVED">
                  Approved
                </SelectItem>

                <SelectItem value="PENDING">
                  Pending
                </SelectItem>

                <SelectItem value="REJECTED">
                  Rejected
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}

          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {filteredMentors.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {mentors.length}
            </span>{" "}
            mentors
          </div>

          {/* Table */}

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>

                  <TableHead>
                    Employee ID
                  </TableHead>

                  <TableHead>
                    Department
                  </TableHead>

                  <TableHead>
                    Designation
                  </TableHead>

                  <TableHead>
                    Specialization
                  </TableHead>

                  <TableHead>Status</TableHead>

                  <TableHead className="w-[50px]">
                    <span className="sr-only">
                      Actions
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredMentors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-40 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <IconUsers className="mb-3 size-8 text-muted-foreground" />

                        <p className="font-medium">
                          No mentors found
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {mentors.length === 0
                            ? "No mentors have registered with this institute yet."
                            : "Try changing your search or filters."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMentors.map(
                    (mentor) => (
                      <TableRow key={mentor.id}>
                        {/* Mentor */}

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9">
                              <AvatarFallback>
                                {getInitials(
                                  mentor.name
                                )}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {mentor.name}
                              </p>

                              <p className="truncate text-xs text-muted-foreground">
                                {mentor.phone ||
                                  "No phone provided"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Employee ID */}

                        <TableCell>
                          <span className="font-mono text-xs">
                            {mentor.employee_id}
                          </span>
                        </TableCell>

                        {/* Department */}

                        <TableCell>
                          {mentor.department?.name ? (
                            <Badge variant="outline">
                              {
                                mentor.department
                                  .name
                              }
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Designation */}

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconBriefcase className="size-4 shrink-0 text-muted-foreground" />

                            <span>
                              {mentor.designation ||
                                "—"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Specialization */}

                        <TableCell>
                          {mentor.specialization ||
                            "—"}
                        </TableCell>

                        {/* Status */}

                        <TableCell>
                          {getStatusBadge(
                            mentor.profile_status
                          )}
                        </TableCell>

                        {/* Actions */}

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                            >
                              {/* <Button
                                variant="ghost"
                                size="icon"
                              > */}
                                <IconDotsVertical className="size-4" />

                                <span className="sr-only">
                                  Open mentor menu
                                </span>
                              {/* </Button> */}
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="w-44"
                            >
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>
                                        Actions
                                    </DropdownMenuLabel>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem>
                                        View profile
                                    </DropdownMenuItem>

                                    <DropdownMenuItem>
                                        View students
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem>
                                        Edit mentor
                                    </DropdownMenuItem>
                                    {mentor.profile_status !== "APPROVED" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateMentorStatus(
                                            mentor.id,
                                            "APPROVED"
                                          )
                                        }
                                      >
                                        Approve mentor
                                      </DropdownMenuItem>
                                    )}

                                    {mentor.profile_status !== "REJECTED" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleUpdateMentorStatus(
                                            mentor.id,
                                            "REJECTED"
                                          )
                                        }
                                      >
                                        Reject mentor
                                      </DropdownMenuItem>
                                    )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}