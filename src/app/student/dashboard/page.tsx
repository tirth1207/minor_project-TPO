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
  IconLoader,
  IconAlertCircle,
  IconRefresh,
  IconUser,
  IconBriefcase,
  IconFileCertificate,
  IconRobot,
  IconAward,
  IconExclamationCircle,
  IconCircleCheck
} from "@tabler/icons-react"

interface StudentProfile {
  id: string
  name: string
  enrollment_no: string
  branch: string
  semester: number
  cgpa: number
  active_backlogs: number
  phone: string | null
  bio: string | null
  resume_url: string
  profile_status: "PENDING" | "APPROVED" | "REJECTED"
  is_placed: boolean
}

interface EligibleJob {
  id: string
  job_id: string
  local_status: string
  applicant_count: number
  job: {
    id: string
    title: string
    description: string
    ctc_min: number
    ctc_max: number
    location: string
    work_mode: string
    min_cgpa: number
    max_backlogs: number
    require_mock: boolean
    mock_pass_score: number
    company?: {
      company_name: string
      website: string | null
    }
    branches?: {
      branch_name: string
    }[]
  }
}

interface Application {
  id: string
  status: string
  applied_at: string
  mock_score: number | null
  job_college_mapping?: {
    id: string
    job?: {
      id: string
      title: string
      location: string
      work_mode: string
      company?: {
        company_name: string
      }
    }
  }
  rounds?: {
    id: string
    round_name: string
    status: string
    company_feedback: string | null
  }[]
  offers?: {
    id: string
    ctc_offered: number
    status: string
    extended_at: string
    decided_at: string | null
  }[]
}

interface MockInterview {
  id: string
  job_role_context: string
  questions: { id: number; text: string }[]
  answers: string[]
  ai_score: number | null
  ai_feedback: string | null
  status: "GENERATING" | "READY" | "COMPLETED" | "FAILED"
}

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = React.useState<"profile" | "jobs" | "applications" | "mock">("profile")
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Data states
  const [profile, setProfile] = React.useState<StudentProfile | null>(null)
  const [eligibleJobs, setEligibleJobs] = React.useState<EligibleJob[]>([])
  const [applications, setApplications] = React.useState<Application[]>([])
  const [mocks, setMocks] = React.useState<MockInterview[]>([])

  // Profile Edit fields
  const [editName, setEditName] = React.useState("")
  const [editCgpa, setEditCgpa] = React.useState("")
  const [editPhone, setEditPhone] = React.useState("")
  const [editBio, setEditBio] = React.useState("")
  const [editResumeUrl, setEditResumeUrl] = React.useState("")
  const [editBranch, setEditBranch] = React.useState("")
  const [editSemester, setEditSemester] = React.useState("1")
  const [updatingProfile, setUpdatingProfile] = React.useState(false)

  // Mock Prep fields
  const [targetRole, setTargetRole] = React.useState("Frontend Engineer")
  const [activeMock, setActiveMock] = React.useState<MockInterview | null>(null)
  const [mockAnswers, setMockAnswers] = React.useState<string[]>([])
  const [scoringMock, setScoringMock] = React.useState(false)

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

      // Check role
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const role = dbUser?.role || user.app_metadata?.role
      if (role !== "STUDENT") {
        router.push("/unauthorized")
        return
      }

      // 1. Fetch Student Profile
      const profileRes = await fetch("/api/students/profile")
      if (!profileRes.ok) throw new Error("Failed to fetch student profile")
      const profileData = await profileRes.json()
      const studentProf = profileData.profile
      setProfile(studentProf)

      if (studentProf) {
        setEditName(studentProf.name || "")
        setEditCgpa(studentProf.cgpa?.toString() || "")
        setEditPhone(studentProf.phone || "")
        setEditBio(studentProf.bio || "")
        setEditResumeUrl(studentProf.resume_url || "")
        setEditBranch(studentProf.branch || "")
        setEditSemester(studentProf.semester?.toString() || "1")
      }

      // 2. Fetch Eligible Jobs
      const jobsRes = await fetch("/api/students/jobs")
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setEligibleJobs(jobsData.mappings || [])
      }

      // 3. Fetch Applications
      const appsRes = await fetch("/api/students/applications")
      if (appsRes.ok) {
        const appsData = await appsRes.json()
        setApplications(appsData.applications || [])
      }

      // 4. Fetch Historical Mock Interviews
      const mocksRes = await fetch("/api/students/mock-interviews")
      if (mocksRes.ok) {
        const mocksData = await mocksRes.json()
        setMocks(mocksData.mockInterviews || [])
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

  // Profile update handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)
    try {
      const res = await fetch("/api/students/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          cgpa: editCgpa,
          phone: editPhone,
          bio: editBio,
          resume_url: editResumeUrl,
          branch: editBranch,
          semester: editSemester,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")

      alert("Profile updated successfully! Note that modifying name, CGPA, or resume url automatically reverts your status to PENDING verification.")
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Apply to Job
  const handleApplyJob = async (mappingId: string) => {
    if (!profile) return
    if (profile.profile_status !== "APPROVED") {
      alert("Your student profile status is PENDING or REJECTED. You must be APPROVED by your mentor to apply for job drives.")
      return
    }
    if (profile.is_placed) {
      alert("You are already marked as placed! Further recruitment drives are locked.")
      return
    }

    try {
      const res = await fetch(`/api/students/jobs/${mappingId}/apply`, {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to apply for this job")

      alert("Application sent successfully! Good luck with your recruitment drive!")
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  // Accept/Reject extended job offer
  const handleDecideOffer = async (offerId: string, status: "ACCEPTED" | "REJECTED") => {
    const actionText = status === "ACCEPTED" ? "accept" : "reject"
    if (!confirm(`Are you absolutely sure you want to ${actionText} this job offer? This action is terminal and cannot be reversed.`)) return

    try {
      const res = await fetch(`/api/students/offers/${offerId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit decision")

      alert(`Job offer successfully ${status.toLowerCase()}!`)
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  // Start AI Mock Prep interview
  const handleStartMock = async () => {
    if (!targetRole.trim()) return
    setScoringMock(true)
    try {
      const res = await fetch("/api/students/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRoleContext: targetRole })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start mock")

      const mock = data.mockInterview
      setActiveMock(mock)
      setMockAnswers(new Array(mock.questions.length).fill(""))
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setScoringMock(false)
    }
  }

  // Complete and score AI Mock interview
  const handleCompleteMock = async () => {
    if (!activeMock) return
    if (mockAnswers.some(ans => !ans.trim())) {
      alert("Please provide an answer for all mock interview questions.")
      return
    }

    setScoringMock(true)
    try {
      const res = await fetch(`/api/students/mock-interviews/${activeMock.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: mockAnswers })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to score interview")

      alert("AI Mock Interview completed and scored successfully!")
      setActiveMock(null)
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setScoringMock(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
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
                  <BreadcrumbLink href="#">Student Candidate</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Recruitment Dashboard</BreadcrumbPage>
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
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all cursor-pointer"
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
              <span className="text-sm text-zinc-500 font-medium">Loading candidate portal...</span>
            </div>
          ) : (
            <>
              {/* Dynamic status alert */}
              {profile && profile.profile_status !== "APPROVED" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-4 text-sm text-amber-800 flex items-center gap-3 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                  <IconExclamationCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-bold">Your profile is currently PENDING verification</p>
                    <p className="text-xs mt-0.5">Your dashboard application capabilities are locked. Please consult with your assigned Faculty Mentor to review and verify your candidate fields and credentials.</p>
                  </div>
                </div>
              )}

              {profile && profile.is_placed && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/45 p-4 text-sm text-emerald-800 flex items-center gap-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <IconCircleCheck className="h-5 w-5 shrink-0 animate-bounce" />
                  <div>
                    <p className="font-bold">Congratulations! You have been successfully PLACED 🎉</p>
                    <p className="text-xs mt-0.5">Your college placement process is completed. We wish you an amazing corporate career ahead!</p>
                  </div>
                </div>
              )}

              {/* Tabs bar */}
              <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "profile"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconUser className="h-4 w-4" /> Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab("jobs")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "jobs"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconBriefcase className="h-4 w-4" /> Eligible Jobs</span>
                </button>
                <button
                  onClick={() => setActiveTab("applications")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "applications"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconFileCertificate className="h-4 w-4" /> My Applications</span>
                </button>
                <button
                  onClick={() => setActiveTab("mock")}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 mb-[-2px] transition-all cursor-pointer capitalize ${
                    activeTab === "mock"
                      ? "border-primary text-zinc-950 dark:text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><IconRobot className="h-4 w-4" /> AI Mock Prep</span>
                </button>
              </div>

              {/* TAB 1: PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 max-w-3xl">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <IconUser className="h-5 w-5 text-zinc-400" /> Manage Candidate Profile
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">Overwrite your candidate records. Be accurate and professional.</p>

                  <div className="rounded-xl border border-amber-250 bg-amber-50/20 p-4 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/10 dark:text-amber-400 mb-5 flex gap-2.5">
                    <IconExclamationCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">CRITICAL WARNING REGARDING FIELD MODIFICATION:</p>
                      <p className="mt-0.5">Modifying your **Name**, **Cumulative CGPA**, or **Resume Link URL** represents an academic alteration. Upon saving, database triggers will automatically revert your profile status back to **PENDING** verification and temporarily lock job application submissions.</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Cumulative CGPA *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={editCgpa}
                        onChange={e => setEditCgpa(e.target.value)}
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Branch *</label>
                      <input
                        type="text"
                        value={editBranch}
                        onChange={e => setEditBranch(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Current Semester *</label>
                      <select
                        value={editSemester}
                        onChange={e => setEditSemester(e.target.value)}
                        className="w-full h-9 rounded-lg border border-zinc-200 px-2.5 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Academic Resume Link URL *</label>
                      <input
                        type="url"
                        value={editResumeUrl}
                        onChange={e => setEditResumeUrl(e.target.value)}
                        placeholder="e.g. https://drive.google.com/..."
                        className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">Professional Bio</label>
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        rows={3}
                        placeholder="Write a brief professional summary about yourself..."
                        className="w-full rounded-lg border border-zinc-200 p-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-2 text-right">
                      <button
                        type="submit"
                        disabled={updatingProfile}
                        className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                      >
                        {updatingProfile ? "Saving Profile..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: ELIGIBLE JOBS TAB */}
              {activeTab === "jobs" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <IconBriefcase className="h-5 w-5 text-zinc-400" /> Matches Campus Placements
                  </h3>
                  {eligibleJobs.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-12">No active jobs mapped or you do not fulfill academic gates for current drives.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {eligibleJobs.map(mapping => {
                        const job = mapping.job
                        const alreadyApplied = applications.some(app => app.job_college_mapping?.id === mapping.id)
                        return (
                          <div key={mapping.id} className="rounded-xl border border-zinc-150 bg-zinc-50/20 p-5 flex flex-col gap-3 dark:border-zinc-850 dark:bg-zinc-900/5 hover:shadow-sm transition-all">
                            <div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">₹{job.ctc_max} LPA Package</span>
                              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{job.title}</h4>
                              <p className="text-xs text-zinc-500">{job.company?.company_name || "Enterprise Corporate Partner"}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{job.location} • {job.work_mode}</p>
                            </div>

                            <div className="text-[11px] leading-relaxed text-zinc-500 py-1 border-t border-b border-zinc-100 dark:border-zinc-900">
                              <p className="line-clamp-2">{job.description}</p>
                              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">Eligibility: {job.min_cgpa} CGPA • Max {job.max_backlogs} Backlogs</p>
                              {job.require_mock && (
                                <p className="text-[9px] text-amber-600 font-bold mt-0.5">* Passing AI Mock Required ({job.mock_pass_score}%+)</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[10px] text-zinc-400 font-semibold">{mapping.applicant_count} Applicants</span>

                              {alreadyApplied ? (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Applied ✓</span>
                              ) : (
                                <button
                                  onClick={() => handleApplyJob(mapping.id)}
                                  disabled={!profile || profile.profile_status !== "APPROVED"}
                                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                                >
                                  1-Click Apply
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: APPLICATIONS TAB */}
              {activeTab === "applications" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <IconFileCertificate className="h-5 w-5 text-zinc-400" /> Campus Drives Application History
                  </h3>
                  {applications.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-12">You have not submitted any job applications yet.</p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {applications.map(app => {
                        const job = app.job_college_mapping?.job
                        if (!job) return null

                        const activeOffer = app.offers?.find(o => o.status === "EXTENDED")
                        const offerAccepted = app.offers?.find(o => o.status === "ACCEPTED")

                        return (
                          <div key={app.id} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800 flex flex-col gap-4 bg-zinc-50/10">
                            {/* App header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-zinc-100 dark:border-zinc-900">
                              <div>
                                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</h4>
                                <p className="text-xs text-zinc-500">{job.company?.company_name}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">Application Status:</span>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 uppercase tracking-wide">
                                  {app.status}
                                </span>
                              </div>
                            </div>

                            {/* Job round timeline */}
                            <div>
                              <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Round States Progress</h5>
                              <div className="flex flex-wrap gap-2">
                                {app.rounds && app.rounds.length > 0 ? (
                                  app.rounds.map(round => (
                                    <div key={round.id} className="px-3 py-2 rounded-lg border border-zinc-150 bg-white dark:border-zinc-850 dark:bg-zinc-900 text-xs flex flex-col gap-0.5">
                                      <p className="font-bold text-zinc-800 dark:text-zinc-200">{round.round_name}</p>
                                      <p className="text-[10px] font-extrabold text-primary uppercase">{round.status}</p>
                                      {round.company_feedback && (
                                        <p className="text-[9px] text-zinc-400 italic mt-0.5">Note: {round.company_feedback}</p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-zinc-400 italic">No recruitment timeline rounds scheduled yet.</p>
                                )}
                              </div>
                            </div>

                            {/* Offer Section */}
                            {activeOffer && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm text-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-400 animate-pulse">
                                <div>
                                  <p className="font-bold flex items-center gap-1"><IconAward className="h-5 w-5" /> Campus Placement Offer Extended! 🎉</p>
                                  <p className="text-xs mt-0.5">Corporate partner is extending an official job offer with an package package of **₹{activeOffer.ctc_offered} LPA**.</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => handleDecideOffer(activeOffer.id, "ACCEPTED")}
                                    className="h-8 px-4 rounded-lg bg-emerald-600 text-zinc-55 text-xs font-semibold hover:bg-emerald-550 transition-all cursor-pointer"
                                  >
                                    Accept Offer
                                  </button>
                                  <button
                                    onClick={() => handleDecideOffer(activeOffer.id, "REJECTED")}
                                    className="h-8 px-4 rounded-lg bg-rose-50 text-rose-600 border border-rose-150 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
                                  >
                                    Reject Offer
                                  </button>
                                </div>
                              </div>
                            )}

                            {offerAccepted && (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 text-xs text-emerald-800 dark:border-emerald-950 dark:text-emerald-400">
                                <p className="font-bold">✓ Offer Accepted (₹{offerAccepted.ctc_offered} LPA package) - You are hired! 🎉</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AI MOCK PREP TAB */}
              {activeTab === "mock" && (
                <div className="grid gap-6 md:grid-cols-3 items-start">

                  {/* Left: start mock form & metrics */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col gap-4">
                    <h3 className="text-md font-bold flex items-center gap-2 border-b pb-3 border-zinc-100 dark:border-zinc-900">
                      <IconRobot className="h-4.5 w-4.5 text-zinc-400" /> Spawn Mock Prep
                    </h3>

                    {!activeMock ? (
                      <form onSubmit={e => { e.preventDefault(); handleStartMock(); }} className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Job Role Context *</label>
                          <input
                            type="text"
                            placeholder="e.g. Frontend Engineer"
                            value={targetRole}
                            onChange={e => setTargetRole(e.target.value)}
                            className="w-full h-9 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={scoringMock || !targetRole.trim()}
                          className="h-9 px-4 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                        >
                          {scoringMock ? "Seeding Interview..." : "Start AI Mock Prep"}
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl text-xs text-amber-800 dark:bg-amber-950/15 dark:border-amber-950 dark:text-amber-400">
                        <p className="font-bold flex items-center gap-1"><IconExclamationCircle className="h-4 w-4" /> Mock Prep Active</p>
                        <p className="mt-0.5">Please provide your technical answers in the workspace details panel on the right. Scoring takes 3-5 seconds.</p>
                      </div>
                    )}

                    {/* Historical mock scores list */}
                    <div className="flex flex-col gap-2 mt-2">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historical Scores Roster</h4>
                      {mocks.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 italic">No mock records yet.</p>
                      ) : (
                        mocks.map(m => (
                          <div key={m.id} className="p-2.5 border rounded-lg flex items-center justify-between text-xs dark:border-zinc-800 bg-zinc-50/30">
                            <div className="truncate max-w-[140px]">
                              <p className="font-bold truncate text-zinc-800 dark:text-zinc-200">{m.job_role_context}</p>
                              <p className="text-[9px] text-zinc-400 capitalize">{m.status.toLowerCase()}</p>
                            </div>
                            {m.ai_score !== null && (
                              <span className="font-black text-sm text-primary">{m.ai_score}%</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: active mock workspace */}
                  <div className="md:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 min-h-[400px]">
                    {!activeMock ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                        <IconRobot className="h-12 w-12 stroke-[1.2]" />
                        <p className="text-sm font-semibold">Ready to prep? Initiate an AI mock prep workspace to the left</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5">
                        <div className="border-b pb-3 border-zinc-100 dark:border-zinc-900 flex justify-between items-center">
                          <div>
                            <h4 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">AI Mock Workspace: {activeMock.job_role_context}</h4>
                            <p className="text-[10px] text-zinc-400">Provide structured technical explanations for each generated question.</p>
                          </div>
                          <button
                            onClick={() => setActiveMock(null)}
                            className="text-xs text-zinc-400 hover:text-zinc-900 underline"
                          >
                            Reset Workspace
                          </button>
                        </div>

                        <div className="flex flex-col gap-4">
                          {activeMock.questions.map((q, index) => (
                            <div key={q.id} className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                Question {index + 1}: <span className="font-semibold">{q.text}</span>
                              </label>
                              <textarea
                                value={mockAnswers[index] || ""}
                                onChange={e => {
                                  const updated = [...mockAnswers]
                                  updated[index] = e.target.value
                                  setMockAnswers(updated)
                                }}
                                rows={3}
                                placeholder="Write your comprehensive technical explanation here..."
                                className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs focus:outline-primary dark:border-zinc-800 dark:bg-zinc-900"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="border-t pt-4 border-zinc-100 dark:border-zinc-900 text-right">
                          <button
                            onClick={handleCompleteMock}
                            disabled={scoringMock || mockAnswers.some(ans => !ans.trim())}
                            className="h-9 px-6 rounded-lg bg-zinc-950 text-zinc-55 text-xs font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                          >
                            {scoringMock ? "Simulating AI Assessment..." : "Submit Answers & Score Interview"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Feedback critique view if latest is COMPLETED */}
                    {!activeMock && mocks.length > 0 && mocks[0].status === "COMPLETED" && (
                      <div className="mt-6 border-t pt-5 border-zinc-100 dark:border-zinc-900">
                        <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 mb-2">
                          <IconAward className="h-5 w-5 text-zinc-400" /> Latest AI Performance Assessment Report
                        </h4>
                        <div className="p-4 rounded-xl border border-zinc-150 bg-zinc-50/40 text-xs leading-relaxed font-sans whitespace-pre-wrap dark:border-zinc-850 dark:bg-zinc-900/10 dark:text-zinc-300">
                          {mocks[0].ai_feedback}
                        </div>
                      </div>
                    )}
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
