"use client"

import * as React from "react"
import { useMentor } from "../mentor-context"

import {
  IconAddressBook,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconFileDescription,
  IconFileText,
  IconLink,
  IconMapPin,
  IconPhone,
  IconSchool,
  IconSearch,
  IconSparkles,
  IconUsers,
  IconX,
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

type SortKey = "name" | "enrollment_no" | "semester" | "cgpa" | "active_backlogs"

export default function MentorStudentsPage() {
  const {
    students,
    selectedStudentId,
    setSelectedStudentId,
    handleUpdateStudentStatus,
  } = useMentor()

  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey>("name")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  )

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
    setSelectedStudentId(studentId)
    setDialogOpen(true)
  }

  function closeDialog(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setSelectedStudentId(null)
    }
  }

  return (
    <div className="min-w-0 flex-1 space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconUsers className="size-5" />
              Students
            </CardTitle>
            <CardDescription>
              {filteredStudents.length} of {students.length}{" "}
              {students.length === 1 ? "student" : "students"}
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
                Try changing your search or filters.
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
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer"
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
                          <span className="text-sm text-muted-foreground">
                            Unplaced
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle>{selectedStudent.name}</DialogTitle>
                  <StatusBadge status={selectedStudent.profile_status} />
                  {selectedStudent.is_placed && (
                    <Badge variant="secondary">
                      <IconBriefcase className="mr-1 size-3.5" />
                      Placed
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  {selectedStudent.enrollment_no} • {selectedStudent.branch} •
                  Semester {selectedStudent.semester}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SmallMetric label="CGPA" value={String(selectedStudent.cgpa)} />
                  <SmallMetric
                    label="Semester"
                    value={String(selectedStudent.semester)}
                  />
                  <SmallMetric
                    label="Backlogs"
                    value={String(selectedStudent.active_backlogs)}
                  />
                  <SmallMetric
                    label="Placement"
                    value={selectedStudent.is_placed ? "Placed" : "Unplaced"}
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IconAddressBook className="size-5" />
                        Personal Information
                      </CardTitle>
                      <CardDescription>
                        Candidate contact and personal details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <InfoRow
                        icon={<IconCalendar />}
                        label="Date of Birth"
                        value={formatDate(selectedStudent.dob)}
                      />
                      <Separator />
                      <InfoRow
                        icon={<IconPhone />}
                        label="Phone"
                        value={selectedStudent.phone || "Not provided"}
                      />
                      <Separator />
                      <InfoRow
                        icon={<IconMapPin />}
                        label="Address"
                        value={selectedStudent.address || "Not provided"}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IconSchool className="size-5" />
                        Academic Information
                      </CardTitle>
                      <CardDescription>
                        Academic records submitted by the student.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <InfoRow
                        icon={<IconSchool />}
                        label="Branch"
                        value={selectedStudent.branch}
                      />
                      <Separator />
                      <InfoRow
                        label="Enrollment Number"
                        value={selectedStudent.enrollment_no}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Professional Bio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {selectedStudent.bio || "No professional bio provided."}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IconSparkles className="size-5" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStudent.skills?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No skills provided.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Hobbies & Interests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStudent.hobbies?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.hobbies.map((hobby) => (
                            <Badge key={hobby} variant="outline">
                              {hobby}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hobbies provided.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconFileText className="size-5" />
                      Documents
                    </CardTitle>
                    <CardDescription>
                      Resume and academic documents submitted by the student.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <DocumentLink
                      icon={<IconFileDescription />}
                      title="Resume"
                      description="Candidate resume"
                      url={selectedStudent.resume_url}
                    />
                    <DocumentLink
                      icon={<IconFileText />}
                      title="Marksheet"
                      description="Academic marksheet"
                      url={selectedStudent.marksheet_url}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <IconLink className="size-5" />
                      Professional Links
                    </CardTitle>
                    <CardDescription>
                      External profiles submitted by the student.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedStudent.social_links &&
                    Object.keys(selectedStudent.social_links).length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(selectedStudent.social_links).map(
                          ([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                            >
                              <div className="min-w-0">
                                <p className="capitalize text-sm font-medium">
                                  {platform}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {getHostname(url)}
                                </p>
                              </div>
                              <IconExternalLink className="size-4 shrink-0 text-muted-foreground" />
                            </a>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No professional links provided.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Profile Verification
                    </CardTitle>
                    <CardDescription>
                      Verify the submitted information before approving this
                      candidate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Current status</p>
                          <StatusBadge
                            status={selectedStudent.profile_status}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Profile changes return the candidate to pending
                          verification.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleUpdateStudentStatus(
                              selectedStudent.id,
                              "APPROVED"
                            )
                          }
                          disabled={
                            selectedStudent.profile_status === "APPROVED"
                          }
                        >
                          <IconCheck className="size-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleUpdateStudentStatus(
                              selectedStudent.id,
                              "REJECTED"
                            )
                          }
                          disabled={
                            selectedStudent.profile_status === "REJECTED"
                          }
                        >
                          <IconX className="size-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
          <span className="text-muted-foreground">↕</span>
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
      <Badge variant="default">
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
      Pending
    </Badge>
  )
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>

        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {value}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function SmallMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactElement
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      {icon && (
        <div className="mt-0.5 text-muted-foreground">
          {React.cloneElement(
            icon as React.ReactElement<{
              className?: string
            }>,
            {
              className: "size-4",
            }
          )}
        </div>
      )}

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium">
          {value}
        </p>
      </div>
    </div>
  )
}

function DocumentLink({
  icon,
  title,
  description,
  url,
}: {
  icon: React.ReactNode
  title: string
  description: string
  url: string | null | undefined
}) {
  if (!url) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
        <div className="text-muted-foreground">
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium">
            {title}
          </p>

          <p className="text-xs text-muted-foreground">
            Not provided
          </p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-muted-foreground">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium">
            {title}
          </p>

          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <IconExternalLink className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </a>
  )
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "Not provided"

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(
      /^www\./,
      ""
    )
  } catch {
    return url
  }
}