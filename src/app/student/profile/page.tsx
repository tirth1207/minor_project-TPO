"use client"

import * as React from "react"
import { useStudent } from "../student-context"

import {
  IconAlertTriangle,
  IconCheck,
  IconFileText,
  IconSchool,
  IconUser,
} from "@tabler/icons-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function StudentProfilePage() {
  const {
    profile,

    editName,
    setEditName,

    editEnrollmentNo,
    setEditEnrollmentNo,

    editDob,
    setEditDob,

    editAddress,
    setEditAddress,

    editPhone,
    setEditPhone,

    editBio,
    setEditBio,

    editCgpa,
    setEditCgpa,

    editBacklogs,
    setEditBacklogs,

    editSemester,
    setEditSemester,

    editBranch,
    setEditBranch,

    editSkills,
    setEditSkills,

    editHobbies,
    setEditHobbies,

    editResumeUrl,
    setEditResumeUrl,

    editMarksheetUrl,
    setEditMarksheetUrl,

    editSocialLinks,
    setEditSocialLinks,

    updatingProfile,
    handleUpdateProfile,
  } = useStudent()

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
      {/* Header */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Student Profile
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal, academic and placement information.
          </p>
        </div>

        <Badge
          variant={
            profile.profile_status === "APPROVED"
              ? "default"
              : profile.profile_status === "REJECTED"
                ? "destructive"
                : "secondary"
          }
        >
          {profile.profile_status}
        </Badge>
      </div>

      {/* Warning */}

      <Alert>
        <IconAlertTriangle className="size-4" />

        <AlertTitle>
          Changes require verification
        </AlertTitle>

        <AlertDescription>
          Saving changes to your profile will return the profile
          to PENDING status. Your mentor must review and approve
          the updated information before you can continue using
          approval-dependent placement features.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={handleUpdateProfile}
        className="space-y-6"
      >
        {/* Personal information */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="size-5" />
              Personal Information
            </CardTitle>

            <CardDescription>
              Your basic candidate information.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Full Name"
              required
            >
              <Input
                value={editName}
                onChange={(e) =>
                  setEditName(e.target.value)
                }
                required
              />
            </Field>

            <Field
              label="Enrollment Number"
              required
            >
              <Input
                value={editEnrollmentNo}
                onChange={(e) =>
                  setEditEnrollmentNo(e.target.value)
                }
                required
              />
            </Field>

            <Field
              label="Date of Birth"
              required
            >
              <Input
                type="date"
                value={editDob}
                onChange={(e) =>
                  setEditDob(e.target.value)
                }
                required
              />
            </Field>

            <Field
              label="Phone Number"
              required
            >
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) =>
                  setEditPhone(e.target.value)
                }
                placeholder="+91 98765 43210"
                required
              />
            </Field>

            <div className="space-y-2 sm:col-span-2">
              <Label>
                Address
                <span className="text-destructive"> *</span>
              </Label>

              <Textarea
                value={editAddress}
                onChange={(e) =>
                  setEditAddress(e.target.value)
                }
                rows={3}
                placeholder="Enter your address"
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>
                Professional Bio
                <span className="text-destructive"> *</span>
              </Label>

              <Textarea
                value={editBio}
                onChange={(e) =>
                  setEditBio(e.target.value)
                }
                rows={4}
                placeholder="Write a brief professional summary..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic information */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSchool className="size-5" />
              Academic Information
            </CardTitle>

            <CardDescription>
              Your current academic records and placement eligibility
              information.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Branch"
              required
            >
              <Input
                value={editBranch}
                onChange={(e) =>
                  setEditBranch(e.target.value)
                }
                placeholder="Computer Engineering"
                required
              />
            </Field>

            <Field
              label="Current Semester"
              required
            >
              <Select
                value={editSemester}
                onValueChange={(value) =>
                  setEditSemester(value ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>

                <SelectContent>
                  {Array.from(
                    { length: 10 },
                    (_, index) => index + 1
                  ).map((semester) => (
                    <SelectItem
                      key={semester}
                      value={String(semester)}
                    >
                      Semester {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="CGPA"
              required
            >
              <Input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={editCgpa}
                onChange={(e) =>
                  setEditCgpa(e.target.value)
                }
                required
              />
            </Field>

            <Field
              label="Active Backlogs"
              required
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={editBacklogs}
                onChange={(e) =>
                  setEditBacklogs(e.target.value)
                }
                required
              />
            </Field>
          </CardContent>
        </Card>

        {/* Skills */}

        <Card>
          <CardHeader>
            <CardTitle>
              Skills & Interests
            </CardTitle>

            <CardDescription>
              Separate multiple values using commas.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Skills"
              required
            >
              <>
                <Input
                  value={editSkills}
                  onChange={(e) =>
                    setEditSkills(e.target.value)
                  }
                  placeholder="React, TypeScript, Python"
                  required
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editSkills
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                      >
                        {skill}
                      </Badge>
                    ))}
                </div>
              </>
            </Field>

            <Field
              label="Hobbies"
              required
            >
              <>
                <Input
                  value={editHobbies}
                  onChange={(e) =>
                    setEditHobbies(e.target.value)
                  }
                  placeholder="Coding, Robotics, Reading"
                  required
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editHobbies
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((hobby) => (
                      <Badge
                        key={hobby}
                        variant="outline"
                      >
                        {hobby}
                      </Badge>
                    ))}
                </div>
              </>
            </Field>
          </CardContent>
        </Card>

        {/* Documents */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconFileText className="size-5" />
              Documents
            </CardTitle>

            <CardDescription>
              Provide accessible links to your latest documents.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Resume URL"
              required
            >
              <Input
                type="url"
                value={editResumeUrl}
                onChange={(e) =>
                  setEditResumeUrl(e.target.value)
                }
                placeholder="https://..."
                required
              />
            </Field>

            <Field
              label="Marksheet URL"
              required
            >
              <Input
                type="url"
                value={editMarksheetUrl}
                onChange={(e) =>
                  setEditMarksheetUrl(e.target.value)
                }
                placeholder="https://..."
                required
              />
            </Field>
          </CardContent>
        </Card>

        {/* Social */}

        <Card>
          <CardHeader>
            <CardTitle>
              Social & Professional Links
            </CardTitle>

            <CardDescription>
              Add links that recruiters can use to learn more about
              your work.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="LinkedIn" required>
              <Input
                type="url"
                value={editSocialLinks.linkedin ?? ""}
                onChange={(e) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    linkedin: e.target.value,
                  })
                }
                placeholder="https://linkedin.com/in/..."
                required
              />
            </Field>

            <Field label="GitHub" required>
              <Input
                type="url"
                value={editSocialLinks.github ?? ""}
                onChange={(e) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    github: e.target.value,
                  })
                }
                placeholder="https://github.com/..."
                required
              />
            </Field>

            <Field label="Portfolio" required>
              <Input
                type="url"
                value={editSocialLinks.portfolio ?? ""}
                onChange={(e) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    portfolio: e.target.value,
                  })
                }
                placeholder="https://yourportfolio.com"
                required
              />
            </Field>
          </CardContent>
        </Card>

        {/* Save */}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updatingProfile}
            className="min-w-36"
          >
            {updatingProfile ? (
              "Saving..."
            ) : (
              <>
                <IconCheck className="size-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}

        {required && (
          <span className="text-destructive">
            {" "}*
          </span>
        )}
      </Label>

      {children}
    </div>
  )
}