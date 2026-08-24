"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface StudentProfile {
  id: string
  name: string
  enrollment_no: string

  dob: string | null
  address: string | null
  phone: string | null
  bio: string | null

  branch: string
  semester: number
  cgpa: number
  active_backlogs: number

  skills: string[] | null
  hobbies: string[] | null

  resume_url: string
  marksheet_url: string | null

  social_links: Record<string, string> | null

  profile_status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"

  is_placed: boolean
  mentor_id: string | null

  user?: {
    id: string
    org_id: string | null
    dept_id: string | null

    organization?: {
      id: string
      name: string
    } | null

    department?: {
      id: string
      name: string
    } | null
  } | null

  mentor?: {
    id: string

    mentor_profile?: {
      id: string
      name: string
      employee_id: string
      designation: string | null
      qualification: string | null
      specialization: string | null
      phone: string | null
      profile_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
    } | null
  } | null
}

export interface Job {
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
  global_status: string
  company: {
    id: string
    company_name: string
    website: string | null
  } | null
  branches: {
    branch_name: string
  }[]
}

export interface JobWithMapping {
  job: Job
  mapping: {
    id: string
    local_status: string
  } | null
  applicant_count: number
  is_eligible?: boolean
  eligibility_reasons?: {
    branch: boolean
    cgpa: boolean
    backlogs: boolean
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
        id: string
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

export interface MockQuestion {
  id: string
  type: string
  prompt: string
  rubric: string
  referenceAnswer?: string
  language?: string
}

export interface MockInterview {
  id: string
  student_id: string
  job_id?: string | null
  job_college_mapping_id?: string | null
  mock_type?: "PRACTICE" | "JOB_REQUIRED"
  job_role_context: string
  job_spec_snapshot?: any
  questions: MockQuestion[]
  answers: any
  ai_score: number | null
  ai_feedback: string | null
  overall_score: number | null
  mcq_score?: number | null
  theory_score?: number | null
  coding_score?: number | null
  skill_scores?: Record<string, number> | null
  passed?: boolean | null
  ai_summary: string | null
  ai_results: any
  completed_at: string | null
  status:
    | "REQUESTED"
    | "QUEUED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "ANSWERING"
    | "EVALUATING"
    | "EVALUATED"
  retry_count: number
}

interface StudentContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  profile: StudentProfile | null
  jobs: JobWithMapping[]
  applications: Application[]
  mocks: MockInterview[]
  mockInterviews: MockInterview[]

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
  editEnrollmentNo: string
  setEditEnrollmentNo: (v: string) => void
  editDob: string
  setEditDob: (v: string) => void
  editAddress: string
  setEditAddress: (v: string) => void
  editBacklogs: string
  setEditBacklogs: (v: string) => void
  editSkills: string
  setEditSkills: (v: string) => void
  editHobbies: string
  setEditHobbies: (v: string) => void
  editMarksheetUrl: string
  setEditMarksheetUrl: (v: string) => void
  editSocialLinks: Record<string, string>
  setEditSocialLinks: (v: Record<string, string>) => void
  // Mock prep
  targetRole: string
  setTargetRole: (v: string) => void
  activeMock: MockInterview | null
  setActiveMock: (m: MockInterview | null) => void
  mockAnswers: string[]
  setMockAnswers: (ans: string[]) => void
  scoringMock: boolean

  fetchData: (isRefresh?: boolean) => Promise<void>
  refreshMockInterviews: () => Promise<void>
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>
  handleApplyJob: (mappingId: string | null) => Promise<void>
  handleDecideOffer: (offerId: string, status: "ACCEPTED" | "REJECTED") => Promise<void>
  handleStartMock: () => Promise<void>
  handleCompleteMock: (answersOverride?: string[]) => Promise<void>
}

const StudentContext = React.createContext<StudentContextType | undefined>(undefined)

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editDob, setEditDob] = React.useState("")
  const [editEnrollmentNo, setEditEnrollmentNo] = React.useState("")
  const [editAddress, setEditAddress] = React.useState("")
  const [editBacklogs, setEditBacklogs] = React.useState("0")
  const [editSkills, setEditSkills] = React.useState("")
  const [editHobbies, setEditHobbies] = React.useState("")
  const [editMarksheetUrl, setEditMarksheetUrl] = React.useState("")
  const [editSocialLinks, setEditSocialLinks] = React.useState<Record<string, string>>({})
  // Data states
  const [profile, setProfile] = React.useState<StudentProfile | null>(null)
  const [jobs, setJobs] = React.useState<JobWithMapping[]>([])
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

  const refreshMockInterviews = React.useCallback(async () => {
    try {
      const mocksRes = await fetch("/api/students/mock-interviews")
      if (mocksRes.ok) {
        const mocksData = await mocksRes.json()
        setMocks(mocksData.mocks || mocksData.mockInterviews || [])
      }
    } catch (err) {
      console.error("Failed to refresh mock interviews:", err)
    }
  }, [])

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
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      const role = dbUser?.role || user.app_metadata?.role
      if (role !== "STUDENT") {
        router.push("/unauthorized")
        return
      }

      const profileRes = await fetch("/api/students/profile")
      if (!profileRes.ok) throw new Error("Failed to fetch student profile")
      const profileData = await profileRes.json()
      const studentProf = profileData.profile
      setProfile(studentProf)

      if (studentProf) {
        setEditName(studentProf.name ?? "")
        setEditDob(studentProf.dob ?? "")
        setEditAddress(studentProf.address ?? "")
        setEditPhone(studentProf.phone ?? "")
        setEditBio(studentProf.bio ?? "")
        setEditEnrollmentNo(studentProf.enrollment_no ?? "")
        setEditCgpa(studentProf.cgpa?.toString() ?? "")
        setEditBacklogs(studentProf.active_backlogs?.toString() ?? "0")
        setEditBranch(studentProf.branch ?? "")
        setEditSemester(studentProf.semester?.toString() ?? "1")
        setEditSkills(Array.isArray(studentProf.skills) ? studentProf.skills.join(", ") : "")
        setEditHobbies(Array.isArray(studentProf.hobbies) ? studentProf.hobbies.join(", ") : "")
        setEditResumeUrl(studentProf.resume_url ?? "")
        setEditMarksheetUrl(studentProf.marksheet_url ?? "")
        setEditSocialLinks(studentProf.social_links ?? {})
      }

      const jobsRes = await fetch("/api/students/jobs")
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData.jobs || [])
      }

      const appsRes = await fetch("/api/students/applications")
      if (appsRes.ok) {
        const appsData = await appsRes.json()
        setApplications(appsData.applications || [])
      }

      await refreshMockInterviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase, refreshMockInterviews])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)

    try {
      const res = await fetch("/api/students/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          dob: editDob,
          address: editAddress.trim(),
          phone: editPhone.trim(),
          enrollment_no: editEnrollmentNo.trim(),
          bio: editBio.trim(),
          cgpa: Number(editCgpa),
          active_backlogs: Number(editBacklogs),
          semester: Number(editSemester),
          branch: editBranch.trim(),
          skills: editSkills.split(",").map((v) => v.trim()).filter(Boolean),
          hobbies: editHobbies.split(",").map((v) => v.trim()).filter(Boolean),
          resume_url: editResumeUrl.trim(),
          marksheet_url: editMarksheetUrl.trim(),
          social_links: editSocialLinks,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")

      alert("Profile updated successfully. Your profile is now pending mentor verification.")
      await fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleApplyJob = async (mappingId: string | null) => {
    if (!profile) return
    if (profile.profile_status !== "APPROVED") {
      alert("Your student profile status is PENDING or REJECTED. You must be APPROVED by your mentor to apply for job drives.")
      return
    }
    if (profile.is_placed) {
      alert("You are already marked as placed! Further recruitment drives are locked.")
      return
    }
    if (mappingId === null) {
      alert("This job has not yet been approved by your college. You cannot apply until it is approved.")
      return
    }

    try {
      const res = await fetch(`/api/students/jobs/${mappingId}/apply`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to apply for this job")

      alert("Application sent successfully! Good luck with your recruitment drive!")
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

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
      if (err instanceof Error) { alert(err.message) } else { alert("An unexpected error occurred") }
    }
  }

  const handleStartMock = async () => {
    if (!targetRole.trim()) return
    setScoringMock(true)
    try {
      const res = await fetch("/api/students/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start mock")
      setActiveMock(data.mock)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setScoringMock(false)
    }
  }

  const handleCompleteMock = async (answersOverride?: string[]) => {
    if (!activeMock) return
    const answersToSubmit = answersOverride ?? mockAnswers
    setScoringMock(true)
    try {
      const answersPayload = activeMock.questions.map((q, idx) => ({
        questionId: q.id,
        answer: answersToSubmit[idx]?.trim() || "",
      }))

      const res = await fetch(`/api/students/mock-interviews/${activeMock.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to score interview")

      setActiveMock(null)
      await fetchData(true)
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
        jobs,
        applications,
        mocks,
        mockInterviews: mocks,
        editEnrollmentNo,
        setEditEnrollmentNo,
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
        editDob,
        setEditDob,
        editAddress,
        setEditAddress,
        editBacklogs,
        setEditBacklogs,
        editSkills,
        setEditSkills,
        editHobbies,
        setEditHobbies,
        editMarksheetUrl,
        setEditMarksheetUrl,
        editSocialLinks,
        setEditSocialLinks,
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
        refreshMockInterviews,
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
