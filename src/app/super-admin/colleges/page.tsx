"use client"

import * as React from "react"
import { useSuperAdmin } from "../super-admin-context"

import {
  IconBuilding,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function SuperAdminCollegesPage() {
  const [collegeDialogOpen, setCollegeDialogOpen] =
    React.useState(false)

  const [departmentDialogOpen, setDepartmentDialogOpen] =
    React.useState(false)

  const {
    organizations,

    newCollegeName,
    setNewCollegeName,

    newDeptName,
    setNewDeptName,

    selectedCollegeForDept,
    setSelectedCollegeForDept,

    creatingCollege,
    creatingDept,

    expandedCollegeIds,
    toggleCollegeExpand,

    handleUpdateOrgStatus,
    handleDeleteOrg,
    handleUpdateDeptStatus,

    handleCreateCollege,
    handleCreateDept,
  } = useSuperAdmin()

  const openDepartmentDialog = (collegeId: string) => {
    setSelectedCollegeForDept(collegeId)
    setNewDeptName("")
    setDepartmentDialogOpen(true)
  }

  const selectedCollege = organizations.find(
    (org) => org.id === selectedCollegeForDept
  )

  const renderStatusBadge = (status: string) => {
    if (status === "ACTIVE" || status === "APPROVED") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          Active
        </Badge>
      )
    }

    if (status === "PENDING") {
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400"
        >
          Pending
        </Badge>
      )
    }

    return (
      <Badge
        variant="outline"
        className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
      >
        Rejected
      </Badge>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Colleges
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage registered institutions and their departments.
            </p>
          </div>

          <Button onClick={() => setCollegeDialogOpen(true)}>
            <IconPlus className="size-4" />
            Add College
          </Button>
        </div>

        {/* Directory */}
        <div className="overflow-hidden rounded-xl border bg-background">
          {/* Table header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">
                Institutions Directory
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {organizations.length}{" "}
                {organizations.length === 1
                  ? "institution"
                  : "institutions"}{" "}
                registered
              </p>
            </div>
          </div>

          {/* Empty state */}
          {organizations.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40">
                <IconBuilding className="size-5 text-muted-foreground" />
              </div>

              <h3 className="font-semibold">
                No institutions yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first college to start managing
                departments and institutional access.
              </p>

              <Button
                className="mt-5"
                size="sm"
                onClick={() => setCollegeDialogOpen(true)}
              >
                <IconPlus className="size-4" />
                Add College
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12" />

                    <TableHead>
                      Institution
                    </TableHead>

                    <TableHead>
                      Status
                    </TableHead>

                    <TableHead>
                      Registered
                    </TableHead>

                    <TableHead className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {organizations.map((org) => {
                    const isExpanded =
                      Boolean(expandedCollegeIds[org.id])

                    const departments =
                      org.departments ?? []

                    return (
                      <React.Fragment key={org.id}>
                        {/* College row */}
                        <TableRow>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() =>
                                toggleCollegeExpand(org.id)
                              }
                            >
                              {isExpanded ? (
                                <IconChevronDown className="size-4" />
                              ) : (
                                <IconChevronRight className="size-4" />
                              )}

                              <span className="sr-only">
                                {isExpanded
                                  ? "Collapse departments"
                                  : "Expand departments"}
                              </span>
                            </Button>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="hidden size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 sm:flex">
                                <IconBuilding className="size-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {org.name}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {departments.length}{" "}
                                  {departments.length === 1
                                    ? "department"
                                    : "departments"}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {renderStatusBadge(org.status)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(
                              org.created_at
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {org.status !== "ACTIVE" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                  onClick={() =>
                                    handleUpdateOrgStatus(
                                      org.id,
                                      "ACTIVE"
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                              )}

                              {org.status !== "REJECTED" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                  onClick={() =>
                                    handleUpdateOrgStatus(
                                      org.id,
                                      "REJECTED"
                                    )
                                  }
                                >
                                  Reject
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() =>
                                  handleDeleteOrg(org.id)
                                }
                              >
                                <IconTrash className="size-4" />
                                <span className="sr-only">
                                  Delete institution
                                </span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Departments */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell />

                            <TableCell
                              colSpan={4}
                              className="p-0"
                            >
                              <div className="px-4 py-4">
                                <div className="mb-3 flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-medium">
                                      Departments
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      Departments registered under{" "}
                                      {org.name}
                                    </p>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openDepartmentDialog(
                                        org.id
                                      )
                                    }
                                  >
                                    <IconPlus className="size-4" />
                                    Add Department
                                  </Button>
                                </div>

                                {departments.length === 0 ? (
                                  <div className="rounded-lg border border-dashed px-4 py-8 text-center">
                                    <p className="text-sm font-medium">
                                      No departments
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Add the first department
                                      for this institution.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="overflow-hidden rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                          <TableHead>
                                            Department
                                          </TableHead>

                                          <TableHead>
                                            Status
                                          </TableHead>

                                          <TableHead className="text-right">
                                            Actions
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>

                                      <TableBody>
                                        {departments.map(
                                          (dept) => (
                                            <TableRow
                                              key={dept.id}
                                            >
                                              <TableCell className="font-medium">
                                                {dept.name}
                                              </TableCell>

                                              <TableCell>
                                                {renderStatusBadge(
                                                  dept.status
                                                )}
                                              </TableCell>

                                              <TableCell>
                                                <div className="flex justify-end gap-2">
                                                  {dept.status !==
                                                    "ACTIVE" && (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                                      onClick={() =>
                                                        handleUpdateDeptStatus(
                                                          dept.id,
                                                          "ACTIVE"
                                                        )
                                                      }
                                                    >
                                                      Approve
                                                    </Button>
                                                  )}

                                                  {dept.status !==
                                                    "REJECTED" && (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                                      onClick={() =>
                                                        handleUpdateDeptStatus(
                                                          dept.id,
                                                          "REJECTED"
                                                        )
                                                      }
                                                    >
                                                      Reject
                                                    </Button>
                                                  )}
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          )
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Add College Dialog */}
      <Dialog
        open={collegeDialogOpen}
        onOpenChange={setCollegeDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Register new college
            </DialogTitle>

            <DialogDescription>
              Add an institution to the TPO portal.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              handleCreateCollege(event)
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="college-name">
                Institution name
              </Label>

              <Input
                id="college-name"
                value={newCollegeName}
                onChange={(event) =>
                  setNewCollegeName(event.target.value)
                }
                placeholder="e.g. R.C. Technical Institute"
                autoComplete="off"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCollegeDialogOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  creatingCollege ||
                  !newCollegeName.trim()
                }
              >
                {creatingCollege
                  ? "Adding..."
                  : "Add College"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog
        open={departmentDialogOpen}
        onOpenChange={setDepartmentDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add department
            </DialogTitle>

            <DialogDescription>
              Add a new department to{" "}
              {selectedCollege?.name ??
                "the selected institution"}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              handleCreateDept(event)
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="department-name">
                Department name
              </Label>

              <Input
                id="department-name"
                value={newDeptName}
                onChange={(event) =>
                  setNewDeptName(event.target.value)
                }
                placeholder="e.g. Computer Engineering"
                autoComplete="off"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDepartmentDialogOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  creatingDept ||
                  !newDeptName.trim() ||
                  !selectedCollegeForDept
                }
              >
                {creatingDept
                  ? "Adding..."
                  : "Add Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}