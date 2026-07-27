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
    IconSend,
    IconBan,
    IconExternalLink,
    IconCircleCheck
} from "@tabler/icons-react"

interface JobPosting {
    id: string
    title: string
    description: string
    ctc_min: number | null
    ctc_max: number | null
    location: string
    work_mode: string
    min_cgpa: number
    max_backlogs: number
    global_status: "PENDING" | "APPROVED" | "REJECTED"
    require_mock: boolean
    mock_pass_score: number
}

interface Applicant {
    id: string
    status: string
    applied_at: string
    mock_score: number | null
    student?: {
        id: string
        name: string
        enrollment_no: string
        branch: string
        cgpa: number
        active_backlogs: number
        resume_url: string
        email: string
    }
    offer?: {
        id: string
        ctc_offered: number
        status: string
    } | null
}

export default function CompanyDashboard() {
    const router = useRouter()
    const supabase = createClient()

    // Dashboard state
    const [activeTab, setActiveTab] = React.useState<"jobs" | "post-job" | "applicants">("jobs")
    const [loading, setLoading] = React.useState(true)
    const [refreshing, setRefreshing] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Data state
    const [jobs, setJobs] = React.useState<JobPosting[]>([])
    const [companyStatus, setCompanyStatus] = React.useState<string>("PENDING")
    const [selectedJobId, setSelectedJobId] = React.useState<string>("")
    const [applicants, setApplicants] = React.useState<Applicant[]>([])

    // New Job Form fields
    const [jobTitle, setJobTitle] = React.useState("")
    const [jobDesc, setJobDesc] = React.useState("")
    const [jobLocation, setJobLocation] = React.useState("")
    const [workMode, setWorkMode] = React.useState<"ONSITE" | "REMOTE" | "HYBRID">("ONSITE")
    const [ctc, setCtc] = React.useState("")
    const [minCgpa, setMinCgpa] = React.useState("6.00")
    const [maxBacklogs, setMaxBacklogs] = React.useState("0")
    const [requireMock, setRequireMock] = React.useState(false)
    const [mockPassScore, setMockPassScore] = React.useState("50")
    const [branches, setBranches] = React.useState<string[]>([])
    const [postingJob, setPostingJob] = React.useState(false)

    // Bulk selection state
    const [selectedApplicantIds, setSelectedApplicantIds] = React.useState<Record<string, boolean>>({})

    // Offer extend field
    const [extendCtcValues, setExtendCtcValues] = React.useState<Record<string, string>>({})

    const fetchData = React.useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            // Verify session
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Verify Company role
            const { data: dbUser } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .maybeSingle()

            const role = dbUser?.role || user.app_metadata?.role
            if (role !== "COMPANY") {
                router.push("/unauthorized")
                return
            }

            // Fetch company posted jobs
            const jobsRes = await fetch("/api/company/jobs")
            if (!jobsRes.ok) throw new Error("Failed to retrieve jobs")
            const jobsData = await jobsRes.json()
            setJobs(jobsData.jobs || [])
            setCompanyStatus(jobsData.company_status || "PENDING")

            // Keep selected job ID updated or pick first if empty
            if (jobsData.jobs && jobsData.jobs.length > 0) {
                if (!selectedJobId) {
                    setSelectedJobId(jobsData.jobs[0].id)
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [router, supabase, selectedJobId])

    // Fetch applicants whenever selectedJobId changes
    const fetchApplicants = React.useCallback(async () => {
        if (!selectedJobId) {
            setApplicants([])
            return
        }
        try {
            const res = await fetch(`/api/company/jobs/${selectedJobId}/applicants`)
            if (res.ok) {
                const data = await res.json()
                setApplicants(data.applicants || [])
                setSelectedApplicantIds({})
            }
        } catch (err) {
            console.error("Error fetching applicants:", err)
        }
    }, [selectedJobId])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    React.useEffect(() => {
        fetchApplicants()
    }, [fetchApplicants])

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault()
        if (companyStatus !== "ACTIVE") {
            alert("Your corporate profile is PENDING approval from Super Admin. You cannot post job openings yet.")
            return
        }
        setPostingJob(true)
        try {
            const res = await fetch("/api/company/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: jobTitle,
                    description: jobDesc,
                    location: jobLocation,
                    workMode,
                    package: ctc,
                    minCgpa,
                    maxBacklogs,
                    requireMock,
                    mockPassScore,
                    branches: branches.length > 0 ? branches : ["Computer Science", "Information Technology", "Electronics"]
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to post job")

            alert("Job posted successfully! It has been submitted to Super Admin & College Admins for verification/approval.")
            setJobTitle("")
            setJobDesc("")
            setJobLocation("")
            setCtc("")
            setBranches([])
            setRequireMock(false)
            setActiveTab("jobs")
            fetchData(true)
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        } finally {
            setPostingJob(false)
        }
    }

    const handleShortlistApplicant = async (appId: string) => {
        try {
            const res = await fetch("/api/company/applications/shortlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicationIds: [appId] })
            })
            if (!res.ok) throw new Error("Failed to shortlist candidate")

            alert("Candidate shortlisted successfully!")
            fetchApplicants()
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    const handleBulkShortlist = async () => {
        const appIds = Object.keys(selectedApplicantIds).filter(id => selectedApplicantIds[id])
        if (appIds.length === 0) return
        try {
            const res = await fetch("/api/company/applications/shortlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicationIds: appIds })
            })
            if (!res.ok) throw new Error("Failed to shortlist candidates")

            alert(`Successfully shortlisted ${appIds.length} candidate(s)!`)
            fetchApplicants()
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    const handleExtendOffer = async (appId: string) => {
        const value = extendCtcValues[appId]
        if (!value || isNaN(parseFloat(value))) {
            alert("Please specify a valid CTC package offered in LPA.")
            return
        }
        try {
            const res = await fetch(`/api/company/applications/${appId}/offer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ctcOffered: value })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to extend job offer")

            alert("Job offer extended successfully!")
            fetchApplicants()
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    const handleRevokeOffer = async (offerId: string) => {
        if (!confirm("Are you sure you want to revoke this job offer? This action cannot be undone.")) return
        try {
            const res = await fetch(`/api/company/offers/${offerId}/revoke`, {
                method: "PATCH"
            })
            if (!res.ok) throw new Error("Failed to revoke offer")

            alert("Job offer revoked successfully.")
            fetchApplicants()
        } catch (err) {
            alert(err instanceof Error ? err.message : "An unexpected error occurred")
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const renderStatusBadge = (status: "PENDING" | "APPROVED" | "REJECTED" | string) => {
        const baseClass = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        if (status === "ACTIVE" || status === "APPROVED") {
            return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900`}>Approved</span>
        } else if (status === "PENDING") {
            return <span className={`${baseClass} bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900`}>Pending Approval</span>
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
                                        Corporate Partner
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
                    {/* Corporate status check alert */}
                    {companyStatus !== "ACTIVE" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800 flex items-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                            <IconAlertCircle className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-bold">Your corporate account is PENDING approval</p>
                                <p className="text-xs mt-0.5">Your dashboard features are restricted. You can browse, but cannot publish new job postings until Super Admin verifies your corporate credentials.</p>
                            </div>
                        </div>
                    )}

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
                            <span className="text-sm text-zinc-500 font-medium">Fetching corporate panel...</span>
                        </div>
                    ) : (
                        <>
                            {/* Tabs bar */}
                            <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setActiveTab("jobs")}
                                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${activeTab === "jobs"
                                        ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                                        : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                                        }`}
                                >
                                    My Job Postings
                                </button>
                                <button
                                    onClick={() => setActiveTab("post-job")}
                                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${activeTab === "post-job"
                                        ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                                        : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                                        }`}
                                >
                                    Post New Opening
                                </button>
                                <button
                                    onClick={() => setActiveTab("applicants")}
                                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${activeTab === "applicants"
                                        ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                                        : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                                        }`}
                                >
                                    Review Applicants
                                </button>
                            </div>

                            {/* TAB 1: MY JOB POSTINGS */}
                            {activeTab === "jobs" && (
                                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <IconBriefcase className="h-5 w-5 text-zinc-400" /> Active Campus Openings
                                    </h3>
                                    {jobs.length === 0 ? (
                                        <p className="text-sm text-zinc-400 text-center py-12">No jobs posted yet. Click &quot;Post New Opening&quot; tab above to get started!</p>
                                    ) : (
                                        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                                                    <tr>
                                                        <th className="p-3">Job Details</th>
                                                        <th className="p-3">Package (CTC)</th>
                                                        <th className="p-3">Eligibility Gate</th>
                                                        <th className="p-3">Global Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                    {jobs.map(job => (
                                                        <tr key={job.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                                            <td className="p-3">
                                                                <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</p>
                                                                <p className="text-xs text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                                                                <p className="text-xs text-zinc-400 mt-1 max-w-[300px] truncate">{job.description}</p>
                                                            </td>
                                                            <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">
                                                                {job.ctc_max ? `₹${job.ctc_max} LPA` : "Not specified"}
                                                            </td>
                                                            <td className="p-3 text-xs text-zinc-500">
                                                                <p>Min CGPA: <span className="font-bold">{job.min_cgpa}</span></p>
                                                                <p>Max Backlogs: <span className="font-bold text-rose-500">{job.max_backlogs}</span></p>
                                                                {job.require_mock && (
                                                                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">* AI Mock Gate Enabled ({job.mock_pass_score}+)</p>
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
                            )}

                            {/* TAB 2: POST NEW OPENING */}
                            {activeTab === "post-job" && (
                                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 max-w-3xl">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <IconPlus className="h-5 w-5 text-zinc-400" /> Create Campus Recruitment Drive
                                    </h3>
                                    <form onSubmit={handleCreateJob} className="grid gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Job Title *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Software Engineer (Frontend)"
                                                value={jobTitle}
                                                onChange={e => setJobTitle(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Detailed Description *</label>
                                            <textarea
                                                placeholder="Type role description, requirements, and responsibilities..."
                                                value={jobDesc}
                                                onChange={e => setJobDesc(e.target.value)}
                                                rows={4}
                                                className="w-full rounded-lg border border-zinc-200 p-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Work Location *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Bangalore, India"
                                                value={jobLocation}
                                                onChange={e => setJobLocation(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Work Mode *</label>
                                            <select
                                                value={workMode}
                                                onChange={e => setWorkMode(e.target.value as any)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-2.5 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            >
                                                <option value="ONSITE">Onsite</option>
                                                <option value="REMOTE">Remote</option>
                                                <option value="HYBRID">Hybrid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Package offered (CTC in LPA) *</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="e.g. 12"
                                                value={ctc}
                                                onChange={e => setCtc(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Minimum Eligible CGPA *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.00"
                                                max="10.00"
                                                value={minCgpa}
                                                onChange={e => setMinCgpa(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400 block mb-1">Maximum Allowed Backlogs *</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={maxBacklogs}
                                                onChange={e => setMaxBacklogs(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end pb-1">
                                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                                <input
                                                    type="checkbox"
                                                    checked={requireMock}
                                                    onChange={e => setRequireMock(e.target.checked)}
                                                    className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4"
                                                />
                                                Require passing AI Mock interview
                                            </label>
                                        </div>

                                        {requireMock && (
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-400 block mb-1">Mock Pass Score Gate (0 - 100) *</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={mockPassScore}
                                                    onChange={e => setMockPassScore(e.target.value)}
                                                    className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="sm:col-span-2 pt-2 text-right">
                                            <button
                                                type="submit"
                                                disabled={postingJob || companyStatus !== "ACTIVE"}
                                                className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-50 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                                            >
                                                {postingJob ? "Publishing Drive..." : "Publish Job Drive"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* TAB 3: REVIEW APPLICANTS */}
                            {activeTab === "applicants" && (
                                <div className="grid gap-6 md:grid-cols-3 items-start">
                                    {/* Jobs list sidebar */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                                        <h3 className="text-md font-bold flex items-center gap-2">
                                            <IconBriefcase className="h-4.5 w-4.5 text-zinc-400" /> Target Openings
                                        </h3>
                                        <div className="flex flex-col gap-2">
                                            {jobs.map(job => (
                                                <button
                                                    key={job.id}
                                                    onClick={() => setSelectedJobId(job.id)}
                                                    className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedJobId === job.id
                                                        ? 'bg-zinc-900 border-zinc-900 text-zinc-55 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950'
                                                        : 'border-zinc-150 hover:bg-zinc-50 text-zinc-600 dark:border-zinc-850 dark:hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <p className="font-bold truncate">{job.title}</p>
                                                    <p className="text-[10px] opacity-75 mt-0.5">{job.location} • Status: {job.global_status}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Applicants details directory */}
                                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:col-span-2 flex flex-col gap-4">
                                        <div className="flex items-center justify-between border-b pb-3 border-zinc-100 dark:border-zinc-900">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <IconUsers className="h-5 w-5 text-zinc-400" /> Candidates Roster
                                            </h3>
                                            {Object.values(selectedApplicantIds).some(Boolean) && (
                                                <button
                                                    onClick={handleBulkShortlist}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-zinc-50 text-xs font-semibold hover:bg-emerald-500 transition-all cursor-pointer inline-flex items-center gap-1"
                                                >
                                                    <IconCircleCheck className="h-4 w-4" /> Bulk Shortlist
                                                </button>
                                            )}
                                        </div>

                                        <div className="border border-zinc-150 rounded-xl overflow-hidden dark:border-zinc-850">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-zinc-50 border-b border-zinc-150 text-zinc-500 font-semibold dark:bg-zinc-900/50 dark:border-zinc-850">
                                                    <tr>
                                                        <th className="p-3 w-8">
                                                            <input
                                                                type="checkbox"
                                                                checked={applicants.length > 0 && applicants.every(a => selectedApplicantIds[a.id])}
                                                                onChange={e => {
                                                                    const updated: Record<string, boolean> = {}
                                                                    if (e.target.checked) {
                                                                        applicants.forEach(a => {
                                                                            if (a.status === "APPLIED") updated[a.id] = true
                                                                        })
                                                                    }
                                                                    setSelectedApplicantIds(updated)
                                                                }}
                                                                className="rounded border-zinc-300"
                                                            />
                                                        </th>
                                                        <th className="p-3">Candidate Details</th>
                                                        <th className="p-3">Metrics (CGPA/Backlogs)</th>
                                                        <th className="p-3">Mock Score</th>
                                                        <th className="p-3">Application Status</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                                                    {applicants.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="p-6 text-center text-zinc-400">No applicants have registered for this drive yet.</td>
                                                        </tr>
                                                    ) : (
                                                        applicants.map(applicant => {
                                                            const s = applicant.student
                                                            if (!s) return null
                                                            return (
                                                                <tr key={applicant.id} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-900/10">
                                                                    <td className="p-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            disabled={applicant.status !== "APPLIED"}
                                                                            checked={!!selectedApplicantIds[applicant.id]}
                                                                            onChange={e => {
                                                                                setSelectedApplicantIds(prev => ({
                                                                                    ...prev,
                                                                                    [applicant.id]: e.target.checked
                                                                                }))
                                                                            }}
                                                                            className="rounded border-zinc-300 disabled:opacity-50"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 text-xs">
                                                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.name}</p>
                                                                        <p className="text-zinc-400 font-mono mt-0.5">{s.enrollment_no}</p>
                                                                        <a
                                                                            href={s.resume_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5 mt-1 font-semibold"
                                                                        >
                                                                            View Resume <IconExternalLink className="h-2.5 w-2.5" />
                                                                        </a>
                                                                    </td>
                                                                    <td className="p-3 text-xs text-zinc-500">
                                                                        <p>CGPA: <span className="font-bold">{s.cgpa}</span></p>
                                                                        <p>Backlogs: <span className="font-bold text-rose-500">{s.active_backlogs}</span></p>
                                                                    </td>
                                                                    <td className="p-3 font-mono font-bold text-sm">
                                                                        {applicant.mock_score !== null ? `${applicant.mock_score}/100` : <span className="text-zinc-400 text-xs">N/A</span>}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <span className="text-xs font-bold uppercase tracking-wider">{applicant.status}</span>
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        <div className="flex justify-end gap-1.5">
                                                                            {applicant.status === "APPLIED" && (
                                                                                <button
                                                                                    onClick={() => handleShortlistApplicant(applicant.id)}
                                                                                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-0.5"
                                                                                >
                                                                                    <IconCheck className="h-3.5 w-3.5" /> Shortlist
                                                                                </button>
                                                                            )}

                                                                            {applicant.status === "SHORTLISTED" && (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.1"
                                                                                        placeholder="Package Offered (LPA)"
                                                                                        value={extendCtcValues[applicant.id] || ""}
                                                                                        onChange={e => setExtendCtcValues({
                                                                                            ...extendCtcValues,
                                                                                            [applicant.id]: e.target.value
                                                                                        })}
                                                                                        className="w-24 h-7 border rounded text-[10px] px-2 text-center"
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => handleExtendOffer(applicant.id)}
                                                                                        className="px-2 py-1 rounded bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer inline-flex items-center gap-0.5"
                                                                                    >
                                                                                        <IconSend className="h-3 w-3" /> Offer
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            {applicant.offer && applicant.offer.status === "EXTENDED" && (
                                                                                <button
                                                                                    onClick={() => handleRevokeOffer(applicant.offer!.id)}
                                                                                    className="px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 text-xs font-semibold cursor-pointer inline-flex items-center gap-0.5"
                                                                                >
                                                                                    <IconBan className="h-3 w-3" /> Revoke
                                                                                </button>
                                                                            )}

                                                                            {applicant.status === "OFFERED" && (
                                                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Hired 🎉</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
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
