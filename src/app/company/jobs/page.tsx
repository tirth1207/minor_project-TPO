"use client"

import * as React from "react"
import { useCompany } from "../company-context"

import {
  IconBriefcase,
  IconPlus,
  IconLoader2,
  IconDotsVertical,
} from "@tabler/icons-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CompanyJobsPage() {
  const { jobs, fetchData } = useCompany()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const renderStatusBadge = (
    status: "PENDING" | "APPROVED" | "REJECTED" | string
  ) => {
    const baseClass =
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"

    if (status === "ACTIVE" || status === "APPROVED") {
      return (
        <span
          className={`${baseClass} border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400`}
        >
          Approved
        </span>
      )
    }

    if (status === "PENDING") {
      return (
        <span
          className={`${baseClass} border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400`}
        >
          Pending
        </span>
      )
    }

    return (
      <span
        className={`${baseClass} border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400`}
      >
        Rejected
      </span>
    )
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    const branches = String(formData.get("branches") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      location: String(formData.get("location") || ""),

      work_mode: String(
        formData.get("work_mode") || "ONSITE"
      ),

      ctc_min:
        Number(formData.get("ctc_min")) || null,

      ctc_max:
        Number(formData.get("ctc_max")) || null,

      min_cgpa:
        Number(formData.get("min_cgpa")) || 0,

      max_backlogs:
        Number(formData.get("max_backlogs")) || 0,

      require_mock:
        formData.get("require_mock") === "on",

      mock_pass_score:
        Number(formData.get("mock_pass_score")) || null,

      branches,
    }

    try {
      const response = await fetch("/api/company/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create job posting"
        )
      }

      await fetchData(true)
      setDialogOpen(false)
      event.currentTarget.reset()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create job posting"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-secondary bg-background p-4 dark:border-secondary dark:bg-background">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <IconBriefcase className="h-5 w-5 text-zinc-400" />
            Active Campus Openings
          </h3>

          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <IconPlus className="mr-1 h-4 w-4" />
            Post New Opening
          </Button>
        </div>

        {/* Jobs Table */}

          {jobs.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted">
                <IconBriefcase className="size-5 text-muted-foreground" />
              </div>

              <p className="font-medium">No job openings yet</p>

              <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                Create your first campus opportunity and start receiving
                applications from eligible students.
              </p>

              <Button
                size="sm"
                className="mt-5"
                onClick={() => setDialogOpen(true)}
              >
                <IconPlus className="size-4" />
                Post Opening
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              {/* Table header */}

              {/* <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h3 className="font-semibold">
                    Job Openings
                  </h3>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {jobs.length}{" "}
                    {jobs.length === 1 ? "opening" : "openings"} posted
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <IconPlus className="size-4" />
                  Post Opening
                </Button>
              </div> */}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="min-w-[240px] px-4 py-3 font-medium text-muted-foreground">
                        Position
                      </th>

                      <th className="min-w-[150px] px-4 py-3 font-medium text-muted-foreground">
                        Work
                      </th>

                      <th className="min-w-[130px] px-4 py-3 font-medium text-muted-foreground">
                        Package
                      </th>

                      <th className="min-w-[170px] px-4 py-3 font-medium text-muted-foreground">
                        Eligibility
                      </th>


                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                        Applicants
                      </th>

                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Status
                      </th>

                      <th className="w-[60px] px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {jobs.map((job) => {

                      const branches = job.branches ?? []

                      return (
                        <tr
                          key={job.id}
                          className="group transition-colors hover:bg-muted/30"
                        >
                          {/* Position */}

                          <td className="px-4 py-4 align-top">
                            <div className="flex gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                                <IconBriefcase className="size-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate font-medium text-foreground">
                                  {job.title}
                                </p>

                                <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                                  {job.description ||
                                    "No description provided"}
                                </p>

                              </div>
                            </div>
                          </td>

                          {/* Work */}

                          <td className="px-4 py-4 align-top">
                            <div className="space-y-1">
                              <p className="font-medium">
                                {job.location || "Not specified"}
                              </p>

                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="size-1 rounded-full bg-muted-foreground" />

                                {job.work_mode === "ONSITE"
                                  ? "On-site"
                                  : job.work_mode === "HYBRID"
                                    ? "Hybrid"
                                    : job.work_mode === "REMOTE"
                                      ? "Remote"
                                      : job.work_mode || "—"}
                              </div>
                            </div>
                          </td>

                          {/* Package */}

                          <td className="px-4 py-4 align-top">
                            <p className="whitespace-nowrap font-semibold">
                              {job.ctc_min && job.ctc_max
                                ? `₹${job.ctc_min}–${job.ctc_max} LPA`
                                : job.ctc_max
                                  ? `₹${job.ctc_max} LPA`
                                  : job.ctc_min
                                    ? `₹${job.ctc_min}+ LPA`
                                    : "Not disclosed"}
                            </p>

                          </td>

                          {/* Eligibility */}

                          <td className="px-4 py-4 align-top">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1">
                                <span className="rounded-md border bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium">
                                  CGPA ≥ {job.min_cgpa ?? 0}
                                </span>

                                <span className="rounded-md border bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium">
                                  Backlogs ≤ {job.max_backlogs ?? 0}
                                </span>
                              </div>

                              {branches.length > 0 && (
                                <p
                                  className="max-w-[180px] truncate text-xs text-muted-foreground"
                                  title={branches.join(", ")}
                                >
                                  {branches.slice(0, 2).join(", ")}

                                  {branches.length > 2 &&
                                    ` +${branches.length - 2}`}
                                </p>
                              )}

                              {job.require_mock && (
                                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                  Mock score ≥{" "}
                                  {job.mock_pass_score ?? 0}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Applicants */}

                          <td className="px-4 py-4 text-center align-top">
                            <div className="inline-flex min-w-8 items-center justify-center rounded-md border bg-muted/30 px-2 py-1 text-xs font-semibold">
                              {job.college_mappings?.reduce( (total:any, mapping:any) => total + (mapping.applications?.length ?? 0), 0 ) ?? 0}
                            </div>
                          </td>

                          {/* Status */}

                          <td className="px-4 py-4 align-top">
                            {renderStatusBadge(job.global_status)}
                          </td>

                          {/* Actions */}

                          <td className="px-4 py-4 text-right align-top">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Post New Opening</DialogTitle>
              <DialogDescription>
                Create a campus job posting with full eligibility rules so only the right students can see and apply.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[50vh] w-full rounded-md px-1 py-4">
              <FieldGroup>
                <Field>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Software Engineer"
                    required
                  />
                </Field>

                <Field>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the role, responsibilities, skills, and selection process..."
                    required
                    rows={4}
                  />
                </Field>

                <Field>
                  <Label htmlFor="branches">
                    Eligible Branches
                  </Label>
                  <Input
                    id="branches"
                    name="branches"
                    placeholder="Computer Engineering, IT, Electronics"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Separate multiple branches with commas.
                  </p>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Ahmedabad"
                      required
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="work_mode">Work Mode</Label>
                    <Select name="work_mode" required>
                      <SelectTrigger
                        id="work_mode"
                        className="h-10 w-full border-secondary bg-zinc-50/50 dark:border-secondary dark:bg-zinc-900/50"
                      >
                        <SelectValue placeholder="Select work mode" />
                      </SelectTrigger>
                      <SelectContent className="p-2">
                        <SelectItem value="ONSITE">
                          On-site
                        </SelectItem>
                        <SelectItem value="HYBRID">
                          Hybrid
                        </SelectItem>
                        <SelectItem value="REMOTE">
                          Remote
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="ctc_min">
                      Minimum Package (LPA)
                    </Label>
                    <Input
                      id="ctc_min"
                      name="ctc_min"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="4"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="ctc_max">
                      Maximum Package (LPA)
                    </Label>
                    <Input
                      id="ctc_max"
                      name="ctc_max"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="8"
                    />
                  </Field>
                </div>


                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="min_cgpa">Minimum CGPA</Label>
                    <Input
                      id="min_cgpa"
                      name="min_cgpa"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      defaultValue="0"
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="max_backlogs">
                      Maximum Backlogs
                    </Label>
                    <Input
                      id="max_backlogs"
                      name="max_backlogs"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="0"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="drive_type">Drive Type</Label>
                    <Select name="drive_type" defaultValue="CAMPUS">
                      <SelectTrigger className="h-10 w-full border-secondary">
                        <SelectValue placeholder="Select drive type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAMPUS">
                          Campus Drive
                        </SelectItem>
                        <SelectItem value="OFF_CAMPUS">
                          Off Campus
                        </SelectItem>
                        <SelectItem value="POOL">
                          Pool Drive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <Label htmlFor="hiring_batch">
                      Hiring Batch
                    </Label>
                    <Input
                      id="hiring_batch"
                      name="hiring_batch"
                      placeholder="2026"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="mock_pass_score">
                      Mock Pass Score
                    </Label>
                    <Input
                      id="mock_pass_score"
                      name="mock_pass_score"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="70"
                    />
                  </Field>

                  <Field className="flex items-center gap-3 pt-7">
                    <input
                      id="require_mock"
                      name="require_mock"
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                    />
                    <Label htmlFor="require_mock">
                      AI mock test required
                    </Label>
                  </Field>
                </div>

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400">
                    {error}
                  </div>
                )}
              </FieldGroup>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <DialogClose>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Post Opening
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}