"use client"

import * as React from "react"
import { useMentor } from "../mentor-context"

import {
  IconAddressBook,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconExternalLink,
  IconFileDescription,
  IconFileText,
  IconLink,
  IconMapPin,
  IconPhone,
  IconSchool,
  IconSparkles,
  IconUserCheck,
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
import { Separator } from "@/components/ui/separator"

export default function MentorStudentsPage() {
  const {
    students,
    selectedStudentId,
    setSelectedStudentId,
    handleUpdateStudentStatus,
  } = useMentor()

  const selectedStudent = students.find(
    (student) => student.id === selectedStudentId
  )

  return (
    <div className="grid flex-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* Student directory */}

      <Card className="xl:sticky xl:top-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUsers className="size-5" />
            Students
          </CardTitle>

          <CardDescription>
            {students.length}{" "}
            {students.length === 1 ? "student" : "students"} in your
            department
          </CardDescription>
        </CardHeader>

        <CardContent>
          {students.length === 0 ? (
            <div className="py-12 text-center">
              <IconUsers className="mx-auto mb-3 size-8 text-muted-foreground" />

              <p className="text-sm font-medium">
                No students found
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                There are no students matching the current filters.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
              {students.map((student) => {
                const selected =
                  student.id === selectedStudentId

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() =>
                      setSelectedStudentId(student.id)
                    }
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {student.name}
                        </p>

                        <p
                          className={`mt-0.5 truncate text-xs ${
                            selected
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {student.enrollment_no}
                        </p>
                      </div>

                      <StatusBadge
                        status={student.profile_status}
                      />
                    </div>

                    <div
                      className={`mt-3 flex items-center justify-between text-xs ${
                        selected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>
                        Semester {student.semester}
                      </span>

                      <span>
                        CGPA {student.cgpa}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student profile */}

      {!selectedStudent ? (
        <Card>
          <CardContent className="flex min-h-[500px] flex-col items-center justify-center">
            <IconUserCheck className="mb-4 size-12 text-muted-foreground" />

            <p className="font-medium">
              Select a student
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose a student from the directory to review their profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="min-w-0 space-y-6">
          {/* Header */}

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between pt-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {selectedStudent.name}
                    </h1>

                    <StatusBadge
                      status={selectedStudent.profile_status}
                    />

                    {selectedStudent.is_placed && (
                      <Badge variant="secondary">
                        <IconBriefcase className="size-3.5" />
                        Placed
                      </Badge>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedStudent.enrollment_no}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <IconSchool className="size-4" />
                      {selectedStudent.branch}
                    </span>

                    <span>
                      Semester {selectedStudent.semester}
                    </span>

                    {selectedStudent.phone && (
                      <span className="flex items-center gap-1.5">
                        <IconPhone className="size-4" />
                        {selectedStudent.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      handleUpdateStudentStatus(
                        selectedStudent.id,
                        "APPROVED"
                      )
                    }
                    disabled={
                      selectedStudent.profile_status ===
                      "APPROVED"
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
                      selectedStudent.profile_status ===
                      "REJECTED"
                    }
                  >
                    <IconX className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic overview */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="CGPA"
              value={String(selectedStudent.cgpa)}
              description="Cumulative CGPA"
            />

            <MetricCard
              label="Semester"
              value={String(selectedStudent.semester)}
              description="Current semester"
            />

            <MetricCard
              label="Backlogs"
              value={String(selectedStudent.active_backlogs)}
              description="Active backlogs"
            />

            <MetricCard
              label="Placement"
              value={
                selectedStudent.is_placed
                  ? "Placed"
                  : "Unplaced"
              }
              description="Current placement status"
            />
          </div>

          {/* Personal + academic */}

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
                  value={
                    selectedStudent.phone ||
                    "Not provided"
                  }
                />

                <Separator />

                <InfoRow
                  icon={<IconMapPin />}
                  label="Address"
                  value={
                    selectedStudent.address ||
                    "Not provided"
                  }
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

                <Separator />

                <div className="grid grid-cols-3 gap-3">
                  <SmallMetric
                    label="CGPA"
                    value={String(selectedStudent.cgpa)}
                  />

                  <SmallMetric
                    label="Semester"
                    value={String(selectedStudent.semester)}
                  />

                  <SmallMetric
                    label="Backlogs"
                    value={String(
                      selectedStudent.active_backlogs
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bio */}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Professional Bio
              </CardTitle>
            </CardHeader>

            <CardContent>
              {selectedStudent.bio ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {selectedStudent.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No professional bio provided.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Skills + hobbies */}

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
                    {selectedStudent.skills.map(
                      (skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                        >
                          {skill}
                        </Badge>
                      )
                    )}
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
                    {selectedStudent.hobbies.map(
                      (hobby) => (
                        <Badge
                          key={hobby}
                          variant="outline"
                        >
                          {hobby}
                        </Badge>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hobbies provided.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Documents */}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IconFileText className="size-5" />
                Documents
              </CardTitle>

              <CardDescription>
                Review candidate documents before approving the profile.
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

          {/* Social links */}

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
              Object.keys(selectedStudent.social_links)
                .length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Object.entries(
                    selectedStudent.social_links
                  ).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No professional links provided.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Approval */}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Profile Verification
              </CardTitle>

              <CardDescription>
                Verify the submitted information and documents before
                approving this candidate.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      Current status
                    </p>

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
                      selectedStudent.profile_status ===
                      "APPROVED"
                    }
                  >
                    <IconCheck className="size-4" />
                    Approve Profile
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
                      selectedStudent.profile_status ===
                      "REJECTED"
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
      )}
    </div>
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