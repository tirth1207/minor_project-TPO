"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMentor } from "../mentor-context"

import {
  IconBriefcase,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconSearch,
  IconUsers,
  IconSelector
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SortKey = "name" | "enrollment_no" | "semester" | "cgpa" | "active_backlogs"

export default function MentorStudentsPage() {
  const router = useRouter()
  const { students } = useMentor()

  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const filteredStudents = React.useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = students.filter((student) => {
      if (!query) return true

      return [
        student.name,
        student.enrollment_no,
        student.branch,
        student.profile_status,
        String(student.semester),
        String(student.cgpa),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })

    return [...filtered].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }

      const comparison = String(aValue ?? "").localeCompare(
        String(bValue ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      )

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [students, search, sortKey, sortDirection])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  function openStudent(studentId: string) {
    router.push(`/mentor/students/${studentId}`)
  }

  return (
    <div className="min-w-0 flex-1 space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconUsers className="size-5" />
              Student Approvals
            </CardTitle>
            <CardDescription>
              {filteredStudents.length} of {students.length}{" "}
              {students.length === 1 ? "student" : "students"} assigned for profile verification
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-80">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter students..."
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <IconUsers className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="text-sm font-medium">No students found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try changing your search query or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader
                      label="Student"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Enrollment No."
                      sortKey="enrollment_no"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHead>Branch</TableHead>
                    <SortableHeader
                      label="Semester"
                      sortKey="semester"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="CGPA"
                      sortKey="cgpa"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Backlogs"
                      sortKey="active_backlogs"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHead>Status</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openStudent(student.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{student.name}</div>
                        {student.phone && (
                          <div className="text-xs text-muted-foreground">
                            {student.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {student.enrollment_no}
                      </TableCell>
                      <TableCell>{student.branch}</TableCell>
                      <TableCell>{student.semester}</TableCell>
                      <TableCell>{student.cgpa}</TableCell>
                      <TableCell>{student.active_backlogs}</TableCell>
                      <TableCell>
                        <StatusBadge status={student.profile_status} />
                      </TableCell>
                      <TableCell>
                        {student.is_placed ? (
                          <Badge variant="secondary">
                            <IconBriefcase className="mr-1 size-3.5" />
                            Placed
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unplaced
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            openStudent(student.id)
                          }}
                          className="h-8 gap-1 text-xs"
                        >
                          Review Profile
                          <IconExternalLink className="size-3.5" />
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

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: SortKey
  activeKey: SortKey
  direction: "asc" | "desc"
  onSort: (key: SortKey) => void
}) {
  const active = sortKey === activeKey

  return (
    <TableHead>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 px-2"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <IconChevronUp className="size-4" />
          ) : (
            <IconChevronDown className="size-4" />
          )
        ) : (
          <span className="text-muted-foreground">
            <IconSelector className="size-4" />
          </span>
        )}
      </Button>
    </TableHead>
  )
}

function StatusBadge({
  status,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED"
}) {
  if (status === "APPROVED") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
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
    <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
      Pending
    </Badge>
  )
}
