"use client"

import * as React from "react"
import { useCompany } from "../company-context"

import {
  IconBriefcase,
  IconPlus,
  IconLoader2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
          Pending Approval
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

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      location: formData.get("location"),
      work_mode: formData.get("work_mode"),
      ctc_min: Number(formData.get("ctc_min")) || null,
      ctc_max: Number(formData.get("ctc_max")) || null,
      min_cgpa: Number(formData.get("min_cgpa")) || 0,
      max_backlogs: Number(formData.get("max_backlogs")) || 0,
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
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header */}

        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <IconBriefcase className="h-5 w-5 text-zinc-400" />

            Active Campus Openings
          </h3>

          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <IconPlus className="mr-1 h-4 w-4" />

            Post New Opening
          </Button>
        </div>

        {/* Jobs */}

        {jobs.length === 0 ? (
          <div className="py-12 text-center">
            <IconBriefcase className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-700" />

            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No jobs posted yet
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Create your first campus opening to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                <tr>
                  <th className="p-3">Job Details</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Work Mode</th>
                  <th className="p-3">Package (CTC)</th>
                  <th className="p-3">Eligibility Gate</th>
                  <th className="p-3">Global Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10"
                  >
                    <td className="p-3">
                      <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        {job.title}
                      </p>

                      <p className="mt-1 max-w-[300px] truncate text-xs text-zinc-400">
                        {job.description}
                      </p>
                    </td>

                    <td className="p-3 text-zinc-500 dark:text-zinc-400">
                      {job.location}
                    </td>

                    <td className="p-3 text-zinc-500 dark:text-zinc-400">
                      {job.work_mode}
                    </td>

                    <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">
                      {job.ctc_min && job.ctc_max
                        ? `₹${job.ctc_min} - ₹${job.ctc_max} LPA`
                        : job.ctc_max
                          ? `₹${job.ctc_max} LPA`
                          : "Not specified"}
                    </td>

                    <td className="p-3 text-xs text-zinc-500">
                      <p>
                        Min CGPA:{" "}
                        <span className="font-bold">
                          {job.min_cgpa}
                        </span>
                      </p>

                      <p>
                        Max Backlogs:{" "}
                        <span className="font-bold">
                          {job.max_backlogs}
                        </span>
                      </p>

                      {job.require_mock && (
                        <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
                          AI Mock Gate Enabled (
                          {job.mock_pass_score}+)
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      {renderStatusBadge(job.global_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Job Dialog */}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                Post New Opening
              </DialogTitle>

              <DialogDescription>
                Create a new campus job opportunity. The
                posting may require approval before becoming
                visible to students.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72 w-full rounded-md px-4 py-6">
              <FieldGroup className="">
                {/* Title */}

                <Field>
                  <Label htmlFor="title">
                    Job Title
                  </Label>

                  <Input
                    id="title"
                    name="title"
                    placeholder="Software Engineer"
                    required
                  />
                </Field>

                {/* Description */}

                <Field>
                  <Label htmlFor="description">
                    Description
                  </Label>

                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the role, responsibilities and requirements..."
                    required
                    rows={2}
                    // className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </Field>

                {/* Location + Work Mode */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="location">
                      Location
                    </Label>

                    <Input
                      id="location"
                      name="location"
                      placeholder="Ahmedabad"
                      required
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="work_mode">
                      Work Mode
                    </Label>

                    <Select name="work_mode" required >
                      <SelectTrigger id="work_mode" className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 h-10 border-zinc-200 dark:border-zinc-800 h-10">
                        <SelectValue placeholder="Select work mode" className="h-10" />
                      </SelectTrigger>

                      <SelectContent className="p-2 h-fit overflow-y-auto">
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

                {/* CTC */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="ctc_min">
                      Minimum CTC (LPA)
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
                      Maximum CTC (LPA)
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

                {/* Eligibility */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="min_cgpa">
                      Minimum CGPA
                    </Label>

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

                {/* Error */}

                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400">
                    {error}
                  </div>
                )}
              </FieldGroup>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                }
              />

              <Button
                type="submit"
                disabled={submitting}
              >
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