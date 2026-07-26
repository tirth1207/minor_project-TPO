"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
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
    IconSchool,
    IconBuilding,
    IconBriefcase,
    IconUsers,
    IconPlus,
    IconTrash,
    IconCheck,
    IconX,
    IconExternalLink,
    IconChevronDown,
    IconChevronRight,
    IconLoader,
    IconAlertCircle,
    IconRefresh
} from "@tabler/icons-react"

// Types matching database schema
interface Department {
    id: string
    name: string
    status: "PENDING" | "ACTIVE" | "REJECTED"
    created_at: string
}

interface Organization {
    id: string
    name: string
    status: "PENDING" | "ACTIVE" | "REJECTED"
    created_at: string
    departments?: Department[]
}

interface CompanyProfile {
    id: string
    user_id: string
    company_name: string
    website: string | null
    status: "PENDING" | "ACTIVE" | "REJECTED"
}

interface JobPosting {
    id: string
    company_id: string
    title: string
    description: string
    ctc_min: number | null
    ctc_max: number | null
    location: string
    work_mode: "REMOTE" | "ONSITE" | "HYBRID"
    min_cgpa: number
    max_backlogs: number
    global_status: "PENDING" | "APPROVED" | "REJECTED"
    company?: {
        company_name: string
        website: string | null
    }
    job_eligible_branches?: { branch_name: string }[]
}

interface Stats {
    organizations: { total: number; active: number; pending: number; rejected: number }
    companies: { total: number; active: number; pending: number; rejected: number }
    jobs: { total: number; active: number; pending: number; rejected: number }
    students: { total: number; placed: number; unplaced: number }
}

function SuperAdminDashboardInner() {
    const router = useRouter()
    const supabase = createClient()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab") as "overview" | "colleges" | "companies" | "jobs" | null

    // Tab state
    const [activeTab, setActiveTab] = React.useState<"overview" | "colleges" | "companies" | "jobs">("overview")

    // Sync tab from URL
    React.useEffect(() => {
        if (tabParam && ["overview", "colleges", "companies", "jobs"].includes(tabParam)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveTab(tabParam)
        }
    }, [tabParam])

    // Update URL when tab changes
    const handleTabChange = (tab: "overview" | "colleges" | "companies" | "jobs") => {
        setActiveTab(tab)
        router.push(`/super-admin?tab=${tab}`)
    }

    // Data states
    const [stats, setStats] = React.useState<Stats | null>(null)
    const [organizations, setOrganizations] = React.useState<Organization[]>([])
    const [companies, setCompanies] = React.useState<CompanyProfile[]>([])
    const [jobs, setJobs] = React.useState<JobPosting[]>([])

    // UI Loading & Errors
    const [loading, setLoading] = React.useState(true)
    const [refreshing, setRefreshing] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Form states
    const [newCollegeName, setNewCollegeName] = React.useState("")
    const [newDeptName, setNewDeptName] = React.useState("")
    const [selectedCollegeForDept, setSelectedCollegeForDept] = React.useState("")
    const [creatingCollege, setCreatingCollege] = React.useState(false)
    const [creatingDept, setCreatingDept] = React.useState(false)

    // Expanded rows for colleges list
    const [expandedCollegeIds, setExpandedCollegeIds] = React.useState<Record<string, boolean>>({})

    const toggleCollegeExpand = (id: string) => {
        setExpandedCollegeIds(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const fetchData = React.useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            // Verify current session role is SA
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: dbUser } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .maybeSingle()

            const role = dbUser?.role || user.app_metadata?.role
            if (role !== "SA") {
                router.push("/unauthorized")
                return
            }

            // Fetch statistics
            const statsRes = await fetch("/api/super-admin/stats")
            console.log(statsRes);
            if (!statsRes.ok) throw new Error("Failed to fetch stats")
            const statsData = await statsRes.json()
            setStats(statsData)

            // Fetch organizations (colleges)
            const orgsRes = await fetch("/api/super-admin/organizations")
            if (!orgsRes.ok) throw new Error("Failed to fetch colleges")
            const orgsData = await orgsRes.json()
            setOrganizations(orgsData.organizations)

            // Fetch company profiles
            const compRes = await fetch("/api/super-admin/companies")
            if (!compRes.ok) throw new Error("Failed to fetch companies")
            const compData = await compRes.json()
            setCompanies(compData.companies)

            // Fetch jobs
            const jobsRes = await fetch("/api/super-admin/jobs")
            if (!jobsRes.ok) throw new Error("Failed to fetch jobs")
            const jobsData = await jobsRes.json()
            setJobs(jobsData.jobs)

        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [router, supabase])

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData()
    }, [fetchData])

    // Handler: Update Organization (College) Status
    const handleUpdateOrgStatus = async (orgId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => {
        try {
            const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            })
            if (!res.ok) throw new Error("Failed to update college status")

            // Local state update
            setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, status } : o))
            fetchData(true) // Silent stats refresh
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    // Handler: Delete Organization
    const handleDeleteOrg = async (orgId: string) => {
        if (!confirm("Are you sure you want to delete this college? This will permanently delete all associated departments and users.")) return
        try {
            const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
                method: "DELETE"
            })
            if (!res.ok) throw new Error("Failed to delete college")

            setOrganizations(prev => prev.filter(o => o.id !== orgId))
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    // Handler: Update Department Status
    const handleUpdateDeptStatus = async (deptId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => {
        try {
            const res = await fetch(`/api/super-admin/departments/${deptId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            })
            if (!res.ok) throw new Error("Failed to update department status")

            // Local update
            setOrganizations(prev => prev.map(o => {
                if (!o.departments) return o
                return {
                    ...o,
                    departments: o.departments.map(d => d.id === deptId ? { ...d, status } : d)
                }
            }))
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    // Handler: Update Company Status
    const handleUpdateCompanyStatus = async (companyId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => {
        try {
            const res = await fetch(`/api/super-admin/companies/${companyId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            })
            if (!res.ok) throw new Error("Failed to update company status")

            setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status } : c))
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    // Handler: Update Job Posting Status
    const handleUpdateJobStatus = async (jobId: string, status: "APPROVED" | "PENDING" | "REJECTED") => {
        try {
            const res = await fetch(`/api/super-admin/jobs/${jobId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ global_status: status })
            })
            if (!res.ok) throw new Error("Failed to update job global status")

            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, global_status: status } : j))
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    // Handler: Create College
    const handleCreateCollege = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCollegeName.trim()) return
        setCreatingCollege(true)
        try {
            const res = await fetch("/api/super-admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCollegeName.trim(), status: "ACTIVE" })
            })
            if (!res.ok) throw new Error("Failed to create college")
            const data = await res.json()

            setOrganizations(prev => [data.organization, ...prev])
            setNewCollegeName("")
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        } finally {
            setCreatingCollege(false)
        }
    }

    // Handler: Create Department
    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDeptName.trim() || !selectedCollegeForDept) return
        setCreatingDept(true)
        try {
            const res = await fetch("/api/super-admin/departments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newDeptName.trim(),
                    org_id: selectedCollegeForDept,
                    status: "ACTIVE"
                })
            })
            if (!res.ok) throw new Error("Failed to create department")
            const data = await res.json()

            // Update organizations local state
            setOrganizations(prev => prev.map(o => {
                if (o.id === selectedCollegeForDept) {
                    return {
                        ...o,
                        departments: [data.department, ...(o.departments || [])]
                    }
                }
                return o
            }))

            setNewDeptName("")
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        } finally {
            setCreatingDept(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    // Render badge helper
    const renderStatusBadge = (status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED") => {
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
                                    <BreadcrumbLink href="#">
                                        Super Admin
                                    </BreadcrumbLink>
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
                            <IconRefresh className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin' : ''}`} />
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

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
                            <IconLoader className="h-8 w-8 text-primary animate-spin" />
                            <span className="text-sm text-zinc-500 font-medium">Fetching platform data...</span>
                        </div>
                    ) : (
                        <>
                            {/* Dashboard Tabs bar */}
                            <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                                {(["overview", "colleges", "companies", "jobs"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => handleTabChange(tab)}
                                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${activeTab === tab
                                            ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                                            : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                                            }`}
                                    >
                                        {tab === "jobs" ? "Job Postings" : tab}
                                    </button>
                                ))}
                            </div>

                            {/* Stat Summary Cards */}
                            {stats && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {/* Stat 1 */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Colleges</span>
                                            <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.organizations.total}</h3>
                                            <span className="text-xs text-zinc-500 mt-0.5 block">{stats.organizations.pending} pending approval</span>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                                            <IconSchool className="h-6 w-6" />
                                        </div>
                                    </div>

                                    {/* Stat 2 */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Companies</span>
                                            <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.companies.total}</h3>
                                            <span className="text-xs text-zinc-500 mt-0.5 block">{stats.companies.pending} pending registration</span>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                                            <IconBuilding className="h-6 w-6" />
                                        </div>
                                    </div>

                                    {/* Stat 3 */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Job Postings</span>
                                            <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">{stats.jobs.total}</h3>
                                            <span className="text-xs text-zinc-500 mt-0.5 block">{stats.jobs.pending} pending global approval</span>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                                            <IconBriefcase className="h-6 w-6" />
                                        </div>
                                    </div>

                                    {/* Stat 4 */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 shadow-xs flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placements</span>
                                            <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-zinc-900 dark:text-zinc-50">
                                                {stats.students.total > 0
                                                    ? `${Math.round((stats.students.placed / stats.students.total) * 100)}%`
                                                    : "0%"
                                                }
                                            </h3>
                                            <span className="text-xs text-zinc-500 mt-0.5 block">{stats.students.placed} of {stats.students.total} placed</span>
                                        </div>
                                        <div className="h-11 w-11 rounded-xl bg-zinc-50 text-zinc-700 flex items-center justify-center dark:bg-zinc-900 dark:text-zinc-300">
                                            <IconUsers className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 1: OVERVIEW */}
                            {activeTab === "overview" && (
                                <div className="grid gap-6 lg:grid-cols-2">
                                    {/* Pending Colleges & Departments */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <IconSchool className="h-5 w-5 text-zinc-400" /> Pending College Approvals
                                        </h3>
                                        <div className="flex-1 overflow-auto max-h-[300px]">
                                            {organizations.filter(o => o.status === "PENDING").length === 0 ? (
                                                <p className="text-sm text-zinc-400 text-center py-8">No colleges pending approval.</p>
                                            ) : (
                                                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                    {organizations.filter(o => o.status === "PENDING").map(org => (
                                                        <div key={org.id} className="flex items-center justify-between py-3">
                                                            <div>
                                                                <p className="font-semibold text-sm">{org.name}</p>
                                                                <p className="text-xs text-zinc-400">Created: {new Date(org.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleUpdateOrgStatus(org.id, "ACTIVE")}
                                                                    className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer"
                                                                    title="Approve"
                                                                >
                                                                    <IconCheck className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateOrgStatus(org.id, "REJECTED")}
                                                                    className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer"
                                                                    title="Reject"
                                                                >
                                                                    <IconX className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pending Company Profiles */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <IconBuilding className="h-5 w-5 text-zinc-400" /> Pending Company Registrations
                                        </h3>
                                        <div className="flex-1 overflow-auto max-h-[300px]">
                                            {companies.filter(c => c.status === "PENDING").length === 0 ? (
                                                <p className="text-sm text-zinc-400 text-center py-8">No companies pending registration.</p>
                                            ) : (
                                                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                    {companies.filter(c => c.status === "PENDING").map(comp => (
                                                        <div key={comp.id} className="flex items-center justify-between py-3">
                                                            <div>
                                                                <p className="font-semibold text-sm">{comp.company_name}</p>
                                                                {comp.website && (
                                                                    <a
                                                                        href={comp.website}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                                                    >
                                                                        {comp.website} <IconExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleUpdateCompanyStatus(comp.id, "ACTIVE")}
                                                                    className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer"
                                                                    title="Approve"
                                                                >
                                                                    <IconCheck className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateCompanyStatus(comp.id, "REJECTED")}
                                                                    className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer"
                                                                    title="Reject"
                                                                >
                                                                    <IconX className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pending Job Postings (Global status) */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4 lg:col-span-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <IconBriefcase className="h-5 w-5 text-zinc-400" /> Pending Global Job Approvals
                                        </h3>
                                        <div className="overflow-auto max-h-[350px]">
                                            {jobs.filter(j => j.global_status === "PENDING").length === 0 ? (
                                                <p className="text-sm text-zinc-400 text-center py-8">No job postings pending global approval.</p>
                                            ) : (
                                                <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                                                            <tr>
                                                                <th className="p-3">Job Details</th>
                                                                <th className="p-3">Company</th>
                                                                <th className="p-3">Package / CTC</th>
                                                                <th className="p-3">Criteria (CGPA/Backlogs)</th>
                                                                <th className="p-3 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                            {jobs.filter(j => j.global_status === "PENDING").map(job => (
                                                                <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                                                    <td className="p-3">
                                                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                                                                        <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className="font-semibold text-zinc-800 dark:text-zinc-300">{job.company?.company_name || "Unknown Company"}</span>
                                                                    </td>
                                                                    <td className="p-3 font-medium">
                                                                        {job.ctc_min && job.ctc_max ? `₹${job.ctc_min} - ₹${job.ctc_max} LPA` : "Not specified"}
                                                                    </td>
                                                                    <td className="p-3 text-xs text-zinc-500">
                                                                        <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                                                                        <p>Max Backlogs: <span className="font-bold">{job.max_backlogs}</span></p>
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        <div className="flex justify-end gap-1.5">
                                                                            <button
                                                                                onClick={() => handleUpdateJobStatus(job.id, "APPROVED")}
                                                                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                                                                            >
                                                                                <IconCheck className="h-3.5 w-3.5" /> Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleUpdateJobStatus(job.id, "REJECTED")}
                                                                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 cursor-pointer text-xs font-semibold inline-flex items-center gap-1"
                                                                            >
                                                                                <IconX className="h-3.5 w-3.5" /> Reject
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: COLLEGES */}
                            {activeTab === "colleges" && (
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
                                                    className="w-full h-8 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
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
                                                    className="w-full h-8 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
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
                            )}

                            {/* TAB 3: COMPANIES */}
                            {activeTab === "companies" && (
                                <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold">Registered Companies</h3>
                                    <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                                                <tr>
                                                    <th className="p-3">Company Name</th>
                                                    <th className="p-3">Website</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                {companies.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-6 text-center text-zinc-400">No companies registered.</td>
                                                    </tr>
                                                ) : (
                                                    companies.map(comp => (
                                                        <tr key={comp.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                                            <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-50">
                                                                {comp.company_name}
                                                            </td>
                                                            <td className="p-3">
                                                                {comp.website ? (
                                                                    <a
                                                                        href={comp.website}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                                                                    >
                                                                        {comp.website} <IconExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-zinc-400 text-xs">Not provided</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                {renderStatusBadge(comp.status)}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex justify-end gap-1.5">
                                                                    {comp.status !== "ACTIVE" && (
                                                                        <button
                                                                            onClick={() => handleUpdateCompanyStatus(comp.id, "ACTIVE")}
                                                                            className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 text-xs font-semibold cursor-pointer"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    )}
                                                                    {comp.status !== "REJECTED" && (
                                                                        <button
                                                                            onClick={() => handleUpdateCompanyStatus(comp.id, "REJECTED")}
                                                                            className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 text-xs font-semibold cursor-pointer"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: JOB POSTINGS */}
                            {activeTab === "jobs" && (
                                <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-6 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold">Global Job Postings</h3>
                                    <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                                                <tr>
                                                    <th className="p-3">Job Details</th>
                                                    <th className="p-3">Company</th>
                                                    <th className="p-3">Package / CTC</th>
                                                    <th className="p-3">Criteria & Branches</th>
                                                    <th className="p-3">Global Status</th>
                                                    <th className="p-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                {jobs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-6 text-center text-zinc-400">No job postings found.</td>
                                                    </tr>
                                                ) : (
                                                    jobs.map(job => (
                                                        <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                                            <td className="p-3">
                                                                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                                                                <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                                                                <p className="text-xs text-zinc-400 mt-1 max-w-[200px] truncate">{job.description}</p>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="font-semibold text-zinc-800 dark:text-zinc-300">{job.company?.company_name || "Unknown Company"}</span>
                                                            </td>
                                                            <td className="p-3 font-semibold">
                                                                {job.ctc_min && job.ctc_max ? `₹${job.ctc_min} - ₹${job.ctc_max} LPA` : "Not specified"}
                                                            </td>
                                                            <td className="p-3 text-xs text-zinc-500 flex flex-col gap-1">
                                                                <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                                                                <p>Max Backlogs: <span className="font-bold">{job.max_backlogs}</span></p>
                                                                <p className="text-[10px] leading-tight text-zinc-400 max-w-[150px] truncate" title={job.job_eligible_branches?.map(b => b.branch_name).join(", ")}>
                                                                    {job.job_eligible_branches && job.job_eligible_branches.length > 0
                                                                        ? job.job_eligible_branches.map(b => b.branch_name).join(", ")
                                                                        : "All branches"
                                                                    }
                                                                </p>
                                                            </td>
                                                            <td className="p-3">
                                                                {renderStatusBadge(job.global_status)}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <div className="flex justify-end gap-1.5">
                                                                    {job.global_status !== "APPROVED" && (
                                                                        <button
                                                                            onClick={() => handleUpdateJobStatus(job.id, "APPROVED")}
                                                                            className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                                                                        >
                                                                            <IconCheck className="h-3.5 w-3.5" /> Approve
                                                                        </button>
                                                                    )}
                                                                    {job.global_status !== "REJECTED" && (
                                                                        <button
                                                                            onClick={() => handleUpdateJobStatus(job.id, "REJECTED")}
                                                                            className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900 text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                                                                        >
                                                                            <IconX className="h-3.5 w-3.5" /> Reject
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
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

export default function SuperAdminPage() {
    return (
        <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen gap-2">
                <IconLoader className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-zinc-500 font-medium">Loading dashboard...</span>
            </div>
        }>
            <SuperAdminDashboardInner />
        </React.Suspense>
    )
}
