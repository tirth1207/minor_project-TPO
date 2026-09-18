"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconAddressBook,
  IconAlertCircle,
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconExternalLink,
  IconFileDescription,
  IconFileText,
  IconLink,
  IconLoader,
  IconMapPin,
  IconPhone,
  IconSchool,
  IconSparkles,
  IconUser,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

type StudentDetail = {
  id: string
  name: string
  enrollment_no: string
  branch: string
  semester: number
  cgpa: number
  active_backlogs: number
  dob?: string | null
  phone?: string | null
  address?: string | null
  bio?: string | null
  skills?: string[] | null
  hobbies?: string[] | null
  resume_url?: string | null
  marksheet_url?: string | null
  social_links?: Record<string, string> | null
  profile_status: "PENDING" | "APPROVED" | "REJECTED"
  is_placed: boolean
  user?: {
    id: string
    department?: {
      id: string
      name: string
    }
  }
  rejection_reason?: string | null
}

export default function MentorStudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params?.id as string

  const [student, setStudent] = React.useState<StudentDetail | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState(false)

  // Confirmation dialog state
  const [pendingAction, setPendingAction] = React.useState<"APPROVED" | "REJECTED" | null>(null)

  const fetchStudent = React.useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mentors/students/${studentId}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load student profile")
      }
      setStudent(data.student)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [studentId])

  React.useEffect(() => {
    fetchStudent()
  }, [fetchStudent])

  const handleConfirmAction = async () => {
    if (!student || !pendingAction) return
    const status = pendingAction
    setUpdating(true)
    setError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`/api/mentors/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_status: status, ...(status === "REJECTED" && rejectionReason ? { rejection_reason: rejectionReason } : {}) }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile status")
      }

      setActionSuccess(data.message || `Student profile ${status.toLowerCase()} successfully.`)
      setStudent((prev) => (prev ? { ...prev, profile_status: status } : null))
      setPendingAction(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile status")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <IconLoader className="size-8 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Loading candidate profile...
        </span>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/mentor/students")}>
          <IconArrowLeft className="mr-1.5 size-4" />
          Back to Students List
        </Button>
        <Card className="rounded-2xl border-rose-200 bg-rose-50/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-rose-700 dark:text-rose-400">
            <IconAlertCircle className="mb-3 size-10" />
            <h3 className="text-base font-semibold">Failed to Load Profile</h3>
            <p className="mt-1 text-xs">{error || "Student profile not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/mentor/students")}>
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {student.name}
              </h1>
              <StatusBadge status={student.profile_status} />
              {student.is_placed && (
                <Badge variant="secondary">
                  <IconBriefcase className="mr-1 size-3.5" />
                  Placed
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {student.enrollment_no} • {student.branch} • Semester {student.semester}
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setPendingAction("APPROVED")}
            disabled={updating || student.profile_status === "APPROVED"}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <IconCheck className="mr-1.5 size-4" />
            Approve Profile
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setPendingAction("REJECTED")}
            disabled={updating || student.profile_status === "REJECTED"}
          >
            <IconX className="mr-1.5 size-4" />
            Reject Profile
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400">
          <IconCheck className="size-5 shrink-0" />
          <p className="font-semibold">{actionSuccess}</p>
        </div>
      )}
      
      {student.rejection_reason && student.profile_status === "REJECTED" && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
          <IconX className="size-5 shrink-0" />
          <p className="font-semibold">Rejection Reason: {student.rejection_reason}</p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmallMetric label="CGPA" value={String(student.cgpa)} />
        <SmallMetric label="Semester" value={String(student.semester)} />
        <SmallMetric label="Active Backlogs" value={String(student.active_backlogs)} />
        <SmallMetric label="Placement Status" value={student.is_placed ? "Placed" : "Unplaced"} />
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconAddressBook className="size-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Candidate contact and personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={<IconCalendar />} label="Date of Birth" value={formatDate(student.dob)} />
            <Separator />
            <InfoRow icon={<IconPhone />} label="Phone" value={student.phone || "Not provided"} />
            <Separator />
            <InfoRow icon={<IconMapPin />} label="Address" value={student.address || "Not provided"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconSchool className="size-5" />
              Academic Record
            </CardTitle>
            <CardDescription>Academic registration credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={<IconSchool />} label="Branch" value={student.branch} />
            <Separator />
            <InfoRow label="Enrollment Number" value={student.enrollment_no} />
            <Separator />
            <InfoRow label="Department" value={student.user?.department?.name || student.branch} />
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconUser className="size-5" />
            Professional Bio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {student.bio || "No professional bio provided by student."}
          </p>
        </CardContent>
      </Card>

      {/* Skills & Hobbies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IconSparkles className="size-5" />
              Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills provided.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hobbies & Interests</CardTitle>
          </CardHeader>
          <CardContent>
            {student.hobbies?.length ? (
              <div className="flex flex-wrap gap-2">
                {student.hobbies.map((hobby) => (
                  <Badge key={hobby} variant="outline">
                    {hobby}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hobbies provided.</p>
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
          <CardDescription>Submitted resume and academic marksheets.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <DocumentLink
            icon={<IconFileDescription />}
            title="Candidate Resume"
            description="Verified resume document"
            url={student.resume_url}
          />
          <DocumentLink
            icon={<IconFileText />}
            title="Academic Marksheet"
            description="Official transcript / marksheet"
            url={student.marksheet_url}
          />
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IconLink className="size-5" />
            Professional Portfolios & Social Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          {student.social_links && Object.keys(student.social_links).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(student.social_links).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border p-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="capitalize text-sm font-medium">{platform}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{url}</p>
                  </div>
                  <IconExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No professional links provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject Action Dialogs */}
      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "APPROVED" ? "Approve Student Profile?" : "Reject Student Profile?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "APPROVED"
                ? "Are you sure you want to approve this student's profile? The student will be allowed to continue through the placement workflow."
                : "Are you sure you want to reject this student's profile?"}
              {pendingAction === "REJECTED" && (
                <Input type="text" placeholder="Reason for rejection..." className="mt-4" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPendingAction(null)} disabled={updating}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={pendingAction === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              onClick={handleConfirmAction}
              disabled={updating}
            >
              {updating && <IconLoader className="mr-1.5 size-4 animate-spin" />}
              {pendingAction === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactElement; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      {icon && (
        <div className="mt-0.5 text-muted-foreground">
          {React.cloneElement(
            icon as React.ReactElement<{ className?: string }>,
            { className: "size-4" }
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function DocumentLink({ icon, title, description, url }: { icon: React.ReactNode; title: string; description: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 opacity-70">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">Not provided</p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <IconExternalLink className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </a>
  )
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
        Approved
      </Badge>
    )
  }
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rejected</Badge>
  }
  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
      Pending
    </Badge>
  )
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
}
