"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBriefcase,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconEdit,
  IconExternalLink,
  IconFileText,
  IconLoader,
  IconPlus,
  IconTrash,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type RoundItem = {
  id: string
  round_name: string
  status: "PENDING" | "SCHEDULED" | "CLEARED" | "FAILED"
  company_feedback: string | null
}

type ApplicationDetail = {
  id: string
  status: string
  applied_at: string
  mock_score: number | null
  student: {
    id: string
    name: string
    enrollment_no: string
    branch: string
    cgpa: number
    active_backlogs: number
    resume_url: string | null
  }
  job_college_mapping: {
    id: string
    job: {
      id: string
      title: string
      location: string
      work_mode: string | null
    }
  }
  rounds: RoundItem[]
}

export default function CompanyInterviewRoundsPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params?.id as string

  const [application, setApplication] = React.useState<ApplicationDetail | null>(null)
  const [rounds, setRounds] = React.useState<RoundItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // Create Round Dialog
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newRoundName, setNewRoundName] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  // Edit Round Dialog
  const [selectedRound, setSelectedRound] = React.useState<RoundItem | null>(null)
  const [editStatus, setEditStatus] = React.useState<"PENDING" | "SCHEDULED" | "CLEARED" | "FAILED">("PENDING")
  const [editName, setEditName] = React.useState("")
  const [editFeedback, setEditFeedback] = React.useState("")
  const [updating, setUpdating] = React.useState(false)

  // Delete Confirm
  const [deletingRoundId, setDeletingRoundId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    setError(null)

    try {
      const [appRes, roundsRes] = await Promise.all([
        fetch(`/api/company/applications/${applicationId}`),
        fetch(`/api/company/applications/${applicationId}/rounds`),
      ])

      const appData = await appRes.json()
      const roundsData = await roundsRes.json()

      if (!appRes.ok) {
        throw new Error(appData.error || "Failed to load application details")
      }

      setApplication(appData.application)
      setRounds(roundsData.rounds || appData.application.rounds || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoundName.trim()) return

    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/company/applications/${applicationId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round_name: newRoundName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create round")
      }

      setSuccess(data.message || "Interview round created successfully")
      setNewRoundName("")
      setCreateOpen(false)
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create round")
    } finally {
      setCreating(false)
    }
  }

  const handleOpenEdit = (round: RoundItem) => {
    setSelectedRound(round)
    setEditName(round.round_name)
    setEditStatus(round.status)
    setEditFeedback(round.company_feedback || "")
  }

  const handleUpdateRound = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRound) return

    setUpdating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/company/applications/${applicationId}/rounds/${selectedRound.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_name: editName.trim(),
          status: editStatus,
          company_feedback: editFeedback.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update interview round")
      }

      setSuccess(data.message || "Interview round updated successfully")
      setSelectedRound(null)
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update round")
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteRound = async () => {
    if (!deletingRoundId) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/company/applications/${applicationId}/rounds/${deletingRoundId}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete round")
      }

      setSuccess(data.message || "Interview round deleted successfully")
      setDeletingRoundId(null)
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete round")
    } finally {
      setDeleting(false)
    }
  }

  const getRoundStatusBadge = (status: RoundItem["status"]) => {
    switch (status) {
      case "CLEARED":
        return (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            <IconCheck className="mr-1 size-3.5" />
            Cleared
          </Badge>
        )
      case "FAILED":
        return (
          <Badge variant="destructive">
            <IconX className="mr-1 size-3.5" />
            Failed
          </Badge>
        )
      case "SCHEDULED":
        return (
          <Badge className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
            <IconClock className="mr-1 size-3.5" />
            Scheduled
          </Badge>
        )
      case "PENDING":
      default:
        return (
          <Badge variant="secondary">
            <IconClock className="mr-1 size-3.5" />
            Pending
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <IconLoader className="size-8 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Loading interview rounds...
        </span>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/company/applicants")}>
          <IconArrowLeft className="mr-1.5 size-4" />
          Back to Applicants
        </Button>
        <Card className="rounded-2xl border-rose-200 bg-rose-50/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-rose-700 dark:text-rose-400">
            <IconAlertCircle className="mb-3 size-10" />
            <h3 className="text-base font-semibold">Error Loading Application</h3>
            <p className="mt-1 text-xs">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const student = application?.student
  const job = application?.job_college_mapping?.job

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/company/applicants")}>
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Interview Rounds & Progression
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Candidate: <span className="font-semibold text-foreground">{student?.name}</span> • Opening: <span className="font-semibold text-foreground">{job?.title}</span>
            </p>
          </div>
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <IconPlus className="mr-1.5 size-4" />
          Add Interview Round
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400">
          <IconCheck className="size-5 shrink-0" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
          <IconAlertCircle className="mt-0.5 size-5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Candidate Application Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <IconUser className="size-4 text-primary" />
            Candidate Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
          <div>
            <span className="text-muted-foreground">Name & Enrollment</span>
            <p className="mt-0.5 font-semibold text-foreground">{student?.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{student?.enrollment_no}</p>
          </div>

          <div>
            <span className="text-muted-foreground">Branch & CGPA</span>
            <p className="mt-0.5 font-medium text-foreground">{student?.branch}</p>
            <p className="font-medium text-foreground">CGPA: {student?.cgpa}</p>
          </div>

          <div>
            <span className="text-muted-foreground">Application Status</span>
            <div className="mt-1">
              <Badge variant="outline" className="font-semibold capitalize">
                {application?.status}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground">Resume</span>
            <div className="mt-1">
              {student?.resume_url ? (
                <a
                  href={student.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <IconFileText className="size-3.5" />
                  View Resume
                  <IconExternalLink className="size-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not provided</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview Rounds List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Scheduled Interview Rounds</h2>
          <span className="text-xs text-muted-foreground">{rounds.length} round(s) total</span>
        </div>

        {rounds.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-10 text-center">
              <IconBriefcase className="mb-3 size-8 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-semibold">No Interview Rounds Scheduled</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Click &quot;Add Interview Round&quot; above to create technical, HR, or aptitude evaluation rounds for this applicant.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rounds.map((round, index) => (
              <Card key={round.id} className="rounded-xl border bg-card">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted font-mono text-xs font-bold">
                      #{index + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{round.round_name}</h3>
                        {getRoundStatusBadge(round.status)}
                      </div>

                      {round.company_feedback && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Feedback:</span> {round.company_feedback}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(round)}>
                      <IconEdit className="mr-1.5 size-3.5" />
                      Update Status
                    </Button>

                    {round.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => setDeletingRoundId(round.id)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Round Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRound}>
            <DialogHeader>
              <DialogTitle>Add Interview Round</DialogTitle>
              <DialogDescription>
                Create a new evaluation step (e.g. Technical Screening, System Design, HR Interview).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Round Name</label>
                <Input
                  placeholder="e.g. Technical Round 1"
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating || !newRoundName.trim()}>
                {creating && <IconLoader className="mr-1.5 size-4 animate-spin" />}
                Create Round
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Round Modal */}
      <Dialog open={!!selectedRound} onOpenChange={(open) => !open && setSelectedRound(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateRound}>
            <DialogHeader>
              <DialogTitle>Update Interview Round</DialogTitle>
              <DialogDescription>
                Update the round name, evaluation status, and notes or feedback.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Round Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <Select
                  value={editStatus}
                  onValueChange={(val) => setEditStatus(val as RoundItem["status"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="CLEARED">Cleared</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Company Feedback / Notes</label>
                <Textarea
                  placeholder="Feedback for student or internal remarks..."
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRound(null)} disabled={updating}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updating}>
                {updating && <IconLoader className="mr-1.5 size-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRoundId} onOpenChange={(open) => !open && setDeletingRoundId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Draft Round?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this draft pending interview round?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingRoundId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteRound} disabled={deleting}>
              {deleting && <IconLoader className="mr-1.5 size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
