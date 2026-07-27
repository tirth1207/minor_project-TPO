"use client"

import * as React from "react"
import { useSuperAdmin } from "../super-admin-context"
import {
  IconPlus,
  IconChevronDown,
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react"

export default function SuperAdminCollegesPage() {
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

  const renderStatusBadge = (status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>Active</span>
    } else if (status === "PENDING") {
      return <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>Pending</span>
    } else {
      return <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>Rejected</span>
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3 items-start">
      {/* Action Forms */}
      <div className="flex flex-col gap-6">
        {/* Create College Form */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
          <h3 className="text-md font-bold flex items-center gap-2">
            <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> Register New College
          </h3>
          <form onSubmit={handleCreateCollege} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Institution Name</label>
              <input
                type="text"
                placeholder="e.g. Stanford University"
                value={newCollegeName}
                onChange={e => setNewCollegeName(e.target.value)}
                className="w-full h-8 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <button
              type="submit"
              disabled={creatingCollege || !newCollegeName.trim()}
              className="w-full h-8 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
            >
              {creatingCollege ? "Adding..." : "Add College"}
            </button>
          </form>
        </div>

        {/* Create Department Form */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
          <h3 className="text-md font-bold flex items-center gap-2">
            <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> Create Department
          </h3>
          <form onSubmit={handleCreateDept} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Institution</label>
              <select
                value={selectedCollegeForDept}
                onChange={e => setSelectedCollegeForDept(e.target.value)}
                className="w-full h-8 rounded-lg border border-zinc-200 px-2.5 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select College</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Department Name</label>
              <input
                type="text"
                placeholder="e.g. Computer Engineering"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                className="w-full h-8 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <button
              type="submit"
              disabled={creatingDept || !newDeptName.trim() || !selectedCollegeForDept}
              className="w-full h-8 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
            >
              {creatingDept ? "Adding..." : "Add Department"}
            </button>
          </form>
        </div>
      </div>

      {/* Colleges List */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 lg:col-span-2 flex flex-col gap-4">
        <h3 className="text-lg font-bold">Institutions Directory</h3>
        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3">College Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Registered On</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-zinc-400">No institutions registered.</td>
                </tr>
              ) : (
                organizations.map(org => {
                  const isExpanded = !!expandedCollegeIds[org.id]
                  const deptCount = org.departments?.length || 0

                  return (
                    <React.Fragment key={org.id}>
                      <tr className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleCollegeExpand(org.id)}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 cursor-pointer"
                          >
                            {isExpanded ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-zinc-900 dark:text-zinc-50">{org.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{deptCount} department{deptCount === 1 ? '' : 's'}</p>
                        </td>
                        <td className="p-3">
                          {renderStatusBadge(org.status)}
                        </td>
                        <td className="p-3 text-zinc-500 text-xs">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {org.status !== "ACTIVE" && (
                              <button
                                onClick={() => handleUpdateOrgStatus(org.id, "ACTIVE")}
                                className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 text-xs cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {org.status !== "REJECTED" && (
                              <button
                                onClick={() => handleUpdateOrgStatus(org.id, "REJECTED")}
                                className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 text-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrg(org.id)}
                              className="p-1 rounded-md border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                              title="Delete Organization"
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Departments list */}
                      {isExpanded && (
                        <tr>
                          <td className="bg-zinc-50/50 dark:bg-zinc-950/40 border-r border-zinc-100 dark:border-zinc-900"></td>
                          <td colSpan={4} className="p-3 bg-zinc-50/50 dark:bg-zinc-950/40">
                            <div className="pl-2 border-l-2 border-zinc-200 dark:border-zinc-700 flex flex-col gap-2">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Departments in {org.name}</h4>
                              {deptCount === 0 ? (
                                <p className="text-xs text-zinc-400">No departments added yet.</p>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {org.departments?.map(dept => (
                                    <div key={dept.id} className="flex items-center justify-between p-2 rounded-lg border border-zinc-150 bg-white dark:border-zinc-850 dark:bg-zinc-900/60 text-xs shadow-2xs">
                                      <div>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{dept.name}</span>
                                        <span className="ml-2">{renderStatusBadge(dept.status)}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        {dept.status !== "ACTIVE" && (
                                          <button
                                            onClick={() => handleUpdateDeptStatus(dept.id, "ACTIVE")}
                                            className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 cursor-pointer"
                                          >
                                            Approve
                                          </button>
                                        )}
                                        {dept.status !== "REJECTED" && (
                                          <button
                                            onClick={() => handleUpdateDeptStatus(dept.id, "REJECTED")}
                                            className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 cursor-pointer"
                                          >
                                            Reject
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
