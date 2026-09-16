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

type ProfileErrors = Partial<Record<string, string>>

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function isValidPhone(value: string) {
  return /^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(value.trim())
}

function isValidDob(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return !Number.isNaN(date.getTime()) && date <= today
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function validateProfile(values: {
  name: string
  enrollmentNo: string
  dob: string
  address: string
  phone: string
  bio: string
  cgpa: string
  backlogs: string
  semester: string
  branch: string
  skills: string
  hobbies: string
  resumeUrl: string
  marksheetUrl: string
  socialLinks: Record<string, string>
}) {
  const errors: ProfileErrors = {}

  const name = values.name.trim()
  const enrollmentNo = values.enrollmentNo.trim()
  const address = values.address.trim()
  const phone = values.phone.trim()
  const bio = values.bio.trim()
  const branch = values.branch.trim()
  const resumeUrl = values.resumeUrl.trim()
  const marksheetUrl = values.marksheetUrl.trim()
  const skills = parseList(values.skills)
  const hobbies = parseList(values.hobbies)

  if (!name) {
    errors.name = "Full name is required."
  } else if (!/^[A-Za-zÀ-ÿ.' -]+$/.test(name)) {
    errors.name = "Use letters, spaces, apostrophes, periods, or hyphens only."
  } else if (name.length > 100) {
    errors.name = "Full name must be 100 characters or fewer."
  }

  if (!enrollmentNo) {
    errors.enrollmentNo = "Enrollment number is required."
  } else if (!/^[A-Za-z0-9._/-]+$/.test(enrollmentNo)) {
    errors.enrollmentNo = "Use only letters, numbers, dots, underscores, slashes, or hyphens."
  } else if (enrollmentNo.length > 50) {
    errors.enrollmentNo = "Enrollment number must be 50 characters or fewer."
  }

  if (!isValidDob(values.dob)) {
    errors.dob = "Enter a valid date of birth that is not in the future."
  }

  if (!address) {
    errors.address = "Address is required."
  } else if (address.length < 10 || address.length > 300) {
    errors.address = "Address must be between 10 and 300 characters."
  }

  if (!phone || !isValidPhone(phone)) {
    errors.phone = "Enter a valid Indian mobile number."
  }

  if (!bio) {
    errors.bio = "Professional bio is required."
  } else if (bio.length < 20 || bio.length > 500) {
    errors.bio = "Bio must be between 20 and 500 characters."
  }

  const cgpa = Number(values.cgpa)

  if (!values.cgpa || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
    errors.cgpa = "CGPA must be between 0 and 10."
  }

  const backlogs = Number(values.backlogs)

  if (
    !Number.isInteger(backlogs) ||
    backlogs < 0 ||
    backlogs > 50
  ) {
    errors.backlogs = "Active backlogs must be a whole number from 0 to 50."
  }

  const semester = Number(values.semester)

  if (
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > 10
  ) {
    errors.semester = "Select a valid semester from 1 to 10."
  }

  if (!branch) {
    errors.branch = "Branch is required."
  } else if (branch.length > 100) {
    errors.branch = "Branch must be 100 characters or fewer."
  }

  if (skills.length === 0) {
    errors.skills = "Add at least one skill."
  } else if (skills.length > 20) {
    errors.skills = "You can add up to 20 skills."
  } else if (skills.some((skill) => skill.length > 50)) {
    errors.skills = "Each skill must be 50 characters or fewer."
  }

  if (hobbies.length === 0) {
    errors.hobbies = "Add at least one hobby."
  } else if (hobbies.length > 20) {
    errors.hobbies = "You can add up to 20 hobbies."
  } else if (hobbies.some((hobby) => hobby.length > 50)) {
    errors.hobbies = "Each hobby must be 50 characters or fewer."
  }

  if (!resumeUrl || !isValidUrl(resumeUrl)) {
    errors.resumeUrl = "Enter a valid HTTP or HTTPS resume URL."
  }

  if (marksheetUrl && !isValidUrl(marksheetUrl)) {
    errors.marksheetUrl = "Enter a valid HTTP or HTTPS marksheet URL."
  }

  for (const key of ["linkedin", "github", "portfolio"]) {
    const value = values.socialLinks[key]?.trim() ?? ""

    if (value && !isValidUrl(value)) {
      errors[key] = `${key} must be a valid HTTP or HTTPS URL.`
    }
  }

  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return (
    <p className="text-xs font-medium text-destructive">
      {message}
    </p>
  )
}

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

  const [errors, setErrors] = React.useState<ProfileErrors>({})

  if (!profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Student profile not found.
        </p>
      </div>
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateProfile({
      name: editName,
      enrollmentNo: editEnrollmentNo,
      dob: editDob,
      address: editAddress,
      phone: editPhone,
      bio: editBio,
      cgpa: editCgpa,
      backlogs: editBacklogs,
      semester: editSemester,
      branch: editBranch,
      skills: editSkills,
      hobbies: editHobbies,
      resumeUrl: editResumeUrl,
      marksheetUrl: editMarksheetUrl,
      socialLinks: editSocialLinks,
    })

    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    await handleUpdateProfile(event)
  }

  const inputClass = (field: string) =>
    errors[field]
      ? "border-destructive focus-visible:ring-destructive"
      : ""

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Student Profile
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal, academic, and placement information.
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

      <Alert>
        <IconAlertTriangle className="size-4" />

        <AlertTitle>
          Changes require verification
        </AlertTitle>

        <AlertDescription>
          Saving changes to your profile will return the profile to
          PENDING status. Your mentor must review and approve the
          updated information before approval-dependent placement
          features can be used.
        </AlertDescription>
      </Alert>

      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <IconAlertTriangle className="size-4" />

          <AlertTitle>
            Please correct the highlighted fields
          </AlertTitle>

          <AlertDescription>
            Your profile has validation errors. Review the fields
            below before saving your changes.
          </AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
      >
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
              error={errors.name}
            >
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={inputClass("name")}
                aria-invalid={Boolean(errors.name)}
              />
            </Field>

            <Field
              label="Enrollment Number"
              required
              error={errors.enrollmentNo}
            >
              <Input
                value={editEnrollmentNo}
                onChange={(event) =>
                  setEditEnrollmentNo(event.target.value)
                }
                className={inputClass("enrollmentNo")}
                aria-invalid={Boolean(errors.enrollmentNo)}
              />
            </Field>

            <Field
              label="Date of Birth"
              required
              error={errors.dob}
            >
              <Input
                type="date"
                value={editDob}
                onChange={(event) => setEditDob(event.target.value)}
                className={inputClass("dob")}
                aria-invalid={Boolean(errors.dob)}
              />
            </Field>

            <Field
              label="Phone Number"
              required
              error={errors.phone}
            >
              <Input
                type="tel"
                value={editPhone}
                onChange={(event) => setEditPhone(event.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass("phone")}
                aria-invalid={Boolean(errors.phone)}
              />
            </Field>

            <Field
              label="Address"
              required
              className="sm:col-span-2"
              error={errors.address}
            >
              <Textarea
                value={editAddress}
                onChange={(event) => setEditAddress(event.target.value)}
                rows={3}
                placeholder="Enter your address"
                className={inputClass("address")}
                aria-invalid={Boolean(errors.address)}
              />
            </Field>

            <Field
              label="Professional Bio"
              required
              className="sm:col-span-2"
              error={errors.bio}
            >
              <Textarea
                value={editBio}
                onChange={(event) => setEditBio(event.target.value)}
                rows={4}
                placeholder="Write a brief professional summary..."
                className={inputClass("bio")}
                aria-invalid={Boolean(errors.bio)}
              />
            </Field>
          </CardContent>
        </Card>

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
              error={errors.branch}
            >
              <Input
                value={editBranch}
                onChange={(event) => setEditBranch(event.target.value)}
                placeholder="Computer Engineering"
                className={inputClass("branch")}
                aria-invalid={Boolean(errors.branch)}
              />
            </Field>

            <Field
              label="Current Semester"
              required
              error={errors.semester}
            >
              <Select
                value={editSemester}
                onValueChange={(value) => setEditSemester(value)}
              >
                <SelectTrigger
                  className={inputClass("semester")}
                  aria-invalid={Boolean(errors.semester)}
                >
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>

                <SelectContent>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (semester) => (
                      <SelectItem
                        key={semester}
                        value={String(semester)}
                      >
                        Semester {semester}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="CGPA"
              required
              error={errors.cgpa}
            >
              <Input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={editCgpa}
                onChange={(event) => setEditCgpa(event.target.value)}
                className={inputClass("cgpa")}
                aria-invalid={Boolean(errors.cgpa)}
              />
            </Field>

            <Field
              label="Active Backlogs"
              required
              error={errors.backlogs}
            >
              <Input
                type="number"
                min="0"
                max="50"
                step="1"
                value={editBacklogs}
                onChange={(event) => setEditBacklogs(event.target.value)}
                className={inputClass("backlogs")}
                aria-invalid={Boolean(errors.backlogs)}
              />
            </Field>
          </CardContent>
        </Card>

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
              error={errors.skills}
            >
              <Input
                value={editSkills}
                onChange={(event) => setEditSkills(event.target.value)}
                placeholder="React, TypeScript, Python"
                className={inputClass("skills")}
                aria-invalid={Boolean(errors.skills)}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {parseList(editSkills).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </Field>

            <Field
              label="Hobbies"
              required
              error={errors.hobbies}
            >
              <Input
                value={editHobbies}
                onChange={(event) => setEditHobbies(event.target.value)}
                placeholder="Coding, Robotics, Reading"
                className={inputClass("hobbies")}
                aria-invalid={Boolean(errors.hobbies)}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {parseList(editHobbies).map((hobby) => (
                  <Badge
                    key={hobby}
                    variant="outline"
                  >
                    {hobby}
                  </Badge>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

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
              error={errors.resumeUrl}
            >
              <Input
                type="url"
                value={editResumeUrl}
                onChange={(event) => setEditResumeUrl(event.target.value)}
                placeholder="https://..."
                className={inputClass("resumeUrl")}
                aria-invalid={Boolean(errors.resumeUrl)}
              />
            </Field>

            <Field
              label="Marksheet URL"
              error={errors.marksheetUrl}
            >
              <Input
                type="url"
                value={editMarksheetUrl}
                onChange={(event) =>
                  setEditMarksheetUrl(event.target.value)
                }
                placeholder="https://..."
                className={inputClass("marksheetUrl")}
                aria-invalid={Boolean(errors.marksheetUrl)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Social & Professional Links
            </CardTitle>

            <CardDescription>
              Add optional links that recruiters can use to learn more
              about your work.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              label="LinkedIn"
              error={errors.linkedin}
            >
              <Input
                type="url"
                value={editSocialLinks.linkedin ?? ""}
                onChange={(event) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    linkedin: event.target.value,
                  })
                }
                placeholder="https://linkedin.com/in/..."
                className={inputClass("linkedin")}
                aria-invalid={Boolean(errors.linkedin)}
              />
            </Field>

            <Field
              label="GitHub"
              error={errors.github}
            >
              <Input
                type="url"
                value={editSocialLinks.github ?? ""}
                onChange={(event) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    github: event.target.value,
                  })
                }
                placeholder="https://github.com/..."
                className={inputClass("github")}
                aria-invalid={Boolean(errors.github)}
              />
            </Field>

            <Field
              label="Portfolio"
              error={errors.portfolio}
            >
              <Input
                type="url"
                value={editSocialLinks.portfolio ?? ""}
                onChange={(event) =>
                  setEditSocialLinks({
                    ...editSocialLinks,
                    portfolio: event.target.value,
                  })
                }
                placeholder="https://yourportfolio.com"
                className={inputClass("portfolio")}
                aria-invalid={Boolean(errors.portfolio)}
              />
            </Field>
          </CardContent>
        </Card>

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
  error,
  className = "",
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>
        {label}

        {required && (
          <span className="text-destructive">
            {" "}*
          </span>
        )}
      </Label>

      {children}
      <FieldError message={error} />
    </div>
  )
}
