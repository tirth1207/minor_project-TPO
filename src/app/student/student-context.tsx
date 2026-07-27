"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface StudentProfile {
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

export interface EligibleJob {
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

export interface Application {
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

export interface MockInterview {
  id: string
  job_role_context: string
  questions: { id: number; text: string }[]
  answers: string[]
  ai_score: number | null
  ai_feedback: string | null
  status: "GENERATING" | "READY" | "COMPLETED" | "FAILED"
}

interface StudentContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  profile: StudentProfile | null
  eligibleJobs: EligibleJob[]
  applications: Application[]
  mocks: MockInterview[]

  // Edit fields
  editName: string
  setEditName: (v: string) => void
  editCgpa: string
  setEditCgpa: (v: string) => void
  editPhone: string
  setEditPhone: (v: string) => void
  editBio: string
  setEditBio: (v: string) => void
  editResumeUrl: string
  setEditResumeUrl: (v: string) => void
  editBranch: string
  setEditBranch: (v: string) => void
  editSemester: string
  setEditSemester: (v: string) => void
  updatingProfile: boolean

  // Mock prep
  targetRole: string
  setTargetRole: (v: string) => void
  activeMock: MockInterview | null
  setActiveMock: (m: MockInterview | null) => void
  mockAnswers: string[]
  setMockAnswers: (ans: string[]) => void
  scoringMock: boolean

  fetchData: (isRefresh?: boolean) => Promise<void>
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>
  handleApplyJob: (mappingId: string) => Promise<void>
  handleDecideOffer: (offerId: string, status: "ACCEPTED" | "REJECTED") => Promise<void>
  handleStartMock: () => Promise<void>
  handleCompleteMock: () => Promise<void>
}

const StudentContext = React.createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

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

  return (
    <StudentContext.Provider
      value={{
        loading,
        refreshing,
        error,
        profile,
        eligibleJobs,
        applications,
        mocks,
        editName,
        setEditName,
        editCgpa,
        setEditCgpa,
        editPhone,
        setEditPhone,
        editBio,
        setEditBio,
        editResumeUrl,
        setEditResumeUrl,
        editBranch,
        setEditBranch,
        editSemester,
        setEditSemester,
        updatingProfile,
        targetRole,
        setTargetRole,
        activeMock,
        setActiveMock,
        mockAnswers,
        setMockAnswers,
        scoringMock,
        fetchData,
        handleUpdateProfile,
        handleApplyJob,
        handleDecideOffer,
        handleStartMock,
        handleCompleteMock,
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const context = React.useContext(StudentContext)
  if (!context) throw new Error("useStudent must be used within StudentProvider")
  return context
}
