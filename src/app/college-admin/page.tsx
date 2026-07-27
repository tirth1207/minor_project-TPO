"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  IconPlus,
  IconLoader,
  IconAlertCircle,
  IconRefresh,
  IconBriefcase,
  IconUsers,
  IconCheck,
  IconX,
  IconSchool,
  IconCopy,
  IconCircleCheck,
  IconListCheck,
  IconExternalLink
} from "@tabler/icons-react"

interface Department {
  id: string
  name: string
  status: "PENDING" | "ACTIVE" | "REJECTED"
  created_at: string
}

interface InviteLink {
  id: string
  dept_id: string
  token: string
  used_count: number
  expires_at: string
  department?: {
    id: string
    name: string
  }
}

interface JobMapping {
  id: string
  job_id: string
  org_id: string
  local_status: "PENDING" | "APPROVED" | "REJECTED"
  job?: {
    id: string
    title: string
    description: string
    ctc_min: number | null
    ctc_max: number | null
    location: string
    work_mode: string
    min_cgpa: number
    max_backlogs: number
    global_status: string
    company?: {
      company_name: string
      website: string | null
    }
    branches?: {
      branch_name: string
    }[]
  }
}

interface Student {
  id: string
  name: string
  enrollment_no: string
  branch: string
  cgpa: number
  active_backlogs: number
  semester: number
  profile_status: "PENDING" | "APPROVED" | "REJECTED"
  is_placed: boolean
  resume_url: string
  user?: {
    department?: {
      name: string
    }
  }
}

export default function CollegeAdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  // Tab State
  const [activeTab, setActiveTab] = React.useState<"departments" | "invites" | "jobs" | "students">("departments")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Data states
  const [departments, setDepartments] = React.useState<Department[]>([])
  const [invites, setInvites] = React.useState<InviteLink[]>([])
  const [jobMappings, setJobMappings] = React.useState<JobMapping[]>([])
  const [students, setStudents] = React.useState<Student[]>([])

  // Form states
  const [deptName, setDeptName] = React.useState("")
  const [submittingDept, setSubmittingDept] = React.useState(false)

  const [selectedDeptId, setSelectedDeptId] = React.useState("")
  const [generatingInvite, setGeneratingInvite] = React.useState(false)
  const [latestInviteUrl, setLatestInviteUrl] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: dbUser } = await supabase
        .from("users")
        .select("role, org_id")
        .eq("id", user.id)
        .maybeSingle()

      const role = dbUser?.role || user.app_metadata?.role
      const org_id = dbUser?.org_id || user.app_metadata?.org_id

      if (role !== "COLLEGE_ADMIN" || !org_id) {
        router.push("/unauthorized")
        return
      }

      // 1. Fetch departments
      const deptsRes = await fetch("/api/college-admin/departments")
      if (!deptsRes.ok) throw new Error("Failed to fetch departments")
      const deptsData = await deptsRes.json()
      setDepartments(deptsData.departments || [])

      // 2. Fetch invite links
      const invitesRes = await fetch("/api/college-admin/invites")
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvites(invitesData.invites || [])
      }

      // 3. Fetch jobs mappings
      const jobsRes = await fetch("/api/college-admin/jobs")
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobMappings(jobsData.mappings || [])
      }

      // 4. Fetch students roster
      const studentsRes = await fetch("/api/college-admin/students")
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(studentsData.students || [])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Create Department Form Handler
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptName.trim()) return

    setSubmittingDept(true)
    try {
      const res = await fetch("/api/college-admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create department")

      setDeptName("")
      alert("Department created successfully!")
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmittingDept(false)
    }
  }

  // Generate Invite Link Form Handler
  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDeptId) {
      alert("Please select a department")
      return
    }

    setGeneratingInvite(true)
    setLatestInviteUrl(null)
    try {
      const res = await fetch("/api/college-admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: selectedDeptId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate invite")

      // Return copyable invite URL path
      const absoluteUrl = `${window.location.origin}${data.inviteUrl}`
      setLatestInviteUrl(absoluteUrl)
      alert("Invite link generated successfully! You can copy it below.")
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setGeneratingInvite(false)
    }
  }

  // Update Job Mapping Status
  const handleUpdateJobStatus = async (mappingId: string, localStatus: "APPROVED" | "REJECTED" | "PENDING") => {
    try {
      const res = await fetch(`/api/college-admin/jobs/${mappingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update status")

      alert(`Job mapping successfully ${localStatus.toLowerCase()}!`)
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    alert("Copied invite link to clipboard!")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const renderStatusBadge = (status: string) => {
    const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
    if (status === "ACTIVE" || status === "APPROVED") {
      return (
        <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>
          Active
        </span>
      )
    } else if (status === "PENDING") {
      return (
        <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>
          Pending
        </span>
      )
    } else {
      return (
        <span className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900`}>
          Rejected
        </span>
      )
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">College Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <IconRefresh className={`h-4.5 w-4.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Error Box */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
              <IconAlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to load data</p>
                <p className="text-xs opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
              <IconLoader className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-zinc-500 font-medium">Fetching college details...</span>
            </div>
          ) : (
            <>
              {/* Tabs bar */}
              <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setActiveTab("departments")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "departments"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Departments
                </button>
                <button
                  onClick={() => setActiveTab("invites")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "invites"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Onboarding Invites
                </button>
                <button
                  onClick={() => setActiveTab("jobs")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Job Approvals
                </button>
                <button
                  onClick={() => setActiveTab("students")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "students"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  Student Roster
                </button>
              </div>

              {/* TAB 1: DEPARTMENTS */}
              {activeTab === "departments" && (
                <div className="grid gap-6 md:grid-cols-3 items-start">
                  {/* Create department form */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                    <h3 className="text-md font-bold flex items-center gap-2">
                      <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> New Department
                    </h3>
                    <form onSubmit={handleCreateDept} className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">
                          Department Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Computer Science"
                          value={deptName}
                          onChange={(e) => setDeptName(e.target.value)}
                          className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingDept || !deptName.trim()}
                        className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                      >
                        {submittingDept ? "Creating..." : "Create Department"}
                      </button>
                    </form>
                  </div>

                  {/* Departments List */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2 flex flex-col gap-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <IconSchool className="h-5 w-5 text-zinc-400" /> Department Directory
                    </h3>
                    {departments.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-6 text-center">
                        No departments registered yet. Use the form to the left to register!
                      </p>
                    ) : (
                      <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                            <tr>
                              <th className="p-3">Department Name</th>
                              <th className="p-3">Created At</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                            {departments.map((dept) => (
                              <tr key={dept.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                                  {dept.name}
                                </td>
                                <td className="p-3 text-xs text-zinc-450">
                                  {new Date(dept.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-3">{renderStatusBadge(dept.status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ONBOARDING INVITES */}
              {activeTab === "invites" && (
                <div className="grid gap-6 md:grid-cols-3 items-start">
                  {/* Generate magic invite token */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                    <h3 className="text-md font-bold flex items-center gap-2">
                      <IconPlus className="h-4.5 w-4.5 text-zinc-400" /> New Magic Link
                    </h3>
                    <form onSubmit={handleGenerateInvite} className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">
                          Target Department *
                        </label>
                        <select
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(e.target.value)}
                          className="w-full h-9 rounded-lg border border-zinc-200 px-2 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                          required
                        >
                          <option value="">-- Choose Department --</option>
                          {departments
                            .filter((d) => d.status === "ACTIVE")
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={generatingInvite || !selectedDeptId}
                        className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                      >
                        {generatingInvite ? "Generating..." : "Generate Magic Invite"}
                      </button>
                    </form>

                    {/* Copy Link Container */}
                    {latestInviteUrl && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 text-xs text-emerald-800 dark:border-emerald-950/30 dark:bg-emerald-950/15 dark:text-emerald-400 mt-2 flex flex-col gap-2">
                        <p className="font-bold flex items-center gap-1.5">
                          <IconCircleCheck className="h-4 w-4" /> Copy Magic Invite Token Link
                        </p>
                        <input
                          type="text"
                          readOnly
                          value={latestInviteUrl}
                          className="w-full p-2 border rounded bg-white text-zinc-700 text-[11px] font-mono dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => handleCopyLink(latestInviteUrl)}
                          className="w-full h-7 mt-1 border rounded bg-white text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-zinc-50 cursor-pointer dark:bg-zinc-900 dark:border-zinc-800"
                        >
                          <IconCopy className="h-3 w-3" /> Copy Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Generated Invites Table */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2 flex flex-col gap-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <IconListCheck className="h-5 w-5 text-zinc-400" /> Active Invite Tokens
                    </h3>
                    {invites.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-6 text-center">
                        No onboarding invite tokens generated yet. Choose a department to create one!
                      </p>
                    ) : (
                      <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                            <tr>
                              <th className="p-3">Department</th>
                              <th className="p-3">Invite Link Url</th>
                              <th className="p-3">Used Count</th>
                              <th className="p-3">Expires At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                            {invites.map((invite) => {
                              const absoluteLink = `${window.location.origin}/register?token=${invite.token}`
                              const isExpired = new Date(invite.expires_at) < new Date()
                              return (
                                <tr key={invite.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                  <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                                    {invite.department?.name || "Unknown Department"}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs text-zinc-500 truncate max-w-[150px] md:max-w-[200px]">
                                        {absoluteLink}
                                      </span>
                                      <button
                                        onClick={() => handleCopyLink(absoluteLink)}
                                        className="p-1 rounded border hover:bg-zinc-50 text-zinc-500 dark:border-zinc-800"
                                        title="Copy Link URL"
                                      >
                                        <IconCopy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono text-sm">{invite.used_count} recruits</td>
                                  <td className="p-3 text-xs">
                                    {isExpired ? (
                                      <span className="text-rose-500 font-semibold">Expired</span>
                                    ) : (
                                      <span>{new Date(invite.expires_at).toLocaleDateString()}</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: JOB APPROVALS */}
              {activeTab === "jobs" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <IconBriefcase className="h-5 w-5 text-zinc-400" /> Assigned Corporate Drives
                  </h3>
                  {jobMappings.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-12">
                      No corporate drives assigned to your college yet. Published company drives will automatically map
                      here.
                    </p>
                  ) : (
                    <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                          <tr>
                            <th className="p-3">Corporate Partner</th>
                            <th className="p-3">Drive Details</th>
                            <th className="p-3">Package Offered</th>
                            <th className="p-3">Eligibility Gates</th>
                            <th className="p-3">Approval Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                          {jobMappings.map((mapping) => {
                            const job = mapping.job
                            if (!job) return null
                            return (
                              <tr key={mapping.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                <td className="p-3 text-xs">
                                  <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                                    {job.company?.company_name || "Enterprise Corporate Partner"}
                                  </p>
                                  {job.company?.website && (
                                    <a
                                      href={job.company.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                    >
                                      Visit Website <IconExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </td>
                                <td className="p-3">
                                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                    {job.title}
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {job.location} • {job.work_mode}
                                  </p>
                                </td>
                                <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">
                                  {job.ctc_max ? `₹${job.ctc_max} LPA` : "Not specified"}
                                </td>
                                <td className="p-3 text-xs text-zinc-550">
                                  <p>
                                    Min CGPA: <span className="font-bold">{job.min_cgpa}</span>
                                  </p>
                                  <p>
                                    Max Backlogs: <span className="font-bold text-rose-500">{job.max_backlogs}</span>
                                  </p>
                                  <p className="text-[10px] mt-1">
                                    Branches:{" "}
                                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                                      {job.branches?.map((b) => b.branch_name).join(", ") || "All branches"}
                                    </span>
                                  </p>
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    {mapping.local_status === "PENDING" ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateJobStatus(mapping.id, "APPROVED")}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 hover:bg-emerald-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                                        >
                                          <IconCheck className="h-3.5 w-3.5" /> Approve
                                        </button>
                                        <button
                                          onClick={() => handleUpdateJobStatus(mapping.id, "REJECTED")}
                                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                                        >
                                          <IconX className="h-3.5 w-3.5" /> Reject
                                        </button>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        {renderStatusBadge(mapping.local_status)}
                                        <button
                                          onClick={() => handleUpdateJobStatus(mapping.id, "PENDING")}
                                          className="text-[10px] text-zinc-400 hover:text-zinc-900 underline"
                                        >
                                          Change Decision
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STUDENTS */}
              {activeTab === "students" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <IconUsers className="h-5 w-5 text-zinc-400" /> Complete Student Directory
                  </h3>
                  {students.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-12">
                      No student profiles registered under your institution yet.
                    </p>
                  ) : (
                    <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                          <tr>
                            <th className="p-3">Candidate Details</th>
                            <th className="p-3">Branch & Semester</th>
                            <th className="p-3">Academic Performance</th>
                            <th className="p-3">Validation Status</th>
                            <th className="p-3">Placement State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                          {students.map((student) => {
                            return (
                              <tr key={student.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                <td className="p-3 text-xs">
                                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {student.name}
                                  </p>
                                  <p className="text-zinc-400 font-mono mt-0.5">{student.enrollment_no}</p>
                                  <a
                                    href={student.resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1 font-semibold"
                                  >
                                    Inspect Resume <IconExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </td>
                                <td className="p-3 text-xs text-zinc-800 dark:text-zinc-300 font-semibold">
                                  <p>{student.branch}</p>
                                  <p className="text-zinc-400 font-normal">Semester {student.semester}</p>
                                </td>
                                <td className="p-3 text-xs text-zinc-500">
                                  <p>
                                    CGPA: <span className="font-bold">{student.cgpa}</span>
                                  </p>
                                  <p>
                                    Backlogs:{" "}
                                    <span className="font-bold text-rose-500">{student.active_backlogs}</span>
                                  </p>
                                </td>
                                <td className="p-3">
                                  {student.profile_status === "APPROVED" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                                      Verified Profile
                                    </span>
                                  ) : student.profile_status === "PENDING" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">
                                      Pending Verification
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900">
                                      Rejected
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {student.is_placed ? (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Placed 🎉
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                      Unplaced
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
export const dynamic = "force-dynamic"
