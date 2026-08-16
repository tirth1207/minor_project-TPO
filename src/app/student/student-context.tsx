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
  type: "behavioral" | "technical" | "coding"
  prompt: string
  rubric: string
  referenceAnswer?: string
  language?: string
}

export interface MockInterview {
  id: string
  job_role_context: string
  questions: MockQuestion[]
  answers: string[]
  ai_score: number | null // legacy field, keep for backward compatibility
  ai_feedback: string | null // legacy field
  overall_score: number | null
  ai_summary: string | null
  ai_results: any // JSON of per‑question results (typed via MockInterviewReport when available)
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
  student_id: string
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
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>
  handleApplyJob: (mappingId: string | null) => Promise<void> // accept nullable mappingId
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
  const [jobs, setJobs] = React.useState<JobWithMapping[]>([]) // changed from eligibleJobs
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
      console.log("Fetched student profile:", profileData)
      const studentProf = profileData.profile
      console.log("Student profile:", studentProf)
      setProfile(studentProf)

      if (studentProf) {
        setEditName(studentProf.name ?? "")
        setEditDob(studentProf.dob ?? "")
        setEditAddress(studentProf.address ?? "")
        setEditPhone(studentProf.phone ?? "")
        setEditBio(studentProf.bio ?? "")
        setEditEnrollmentNo(studentProf.enrollment_no ?? "")

        setEditCgpa(
          studentProf.cgpa?.toString() ?? ""
        )

        setEditBacklogs(
          studentProf.active_backlogs?.toString() ?? "0"
        )

        setEditBranch(studentProf.branch ?? "")

        setEditSemester(
          studentProf.semester?.toString() ?? "1"
        )

        setEditSkills(
          Array.isArray(studentProf.skills)
            ? studentProf.skills.join(", ")
            : ""
        )

        setEditHobbies(
          Array.isArray(studentProf.hobbies)
            ? studentProf.hobbies.join(", ")
            : ""
        )

        setEditResumeUrl(
          studentProf.resume_url ?? ""
        )

        setEditMarksheetUrl(
          studentProf.marksheet_url ?? ""
        )

        setEditSocialLinks(
          studentProf.social_links ?? {}
        )
      }

      // 2. Fetch Jobs (now returns jobs with mapping info)
      const jobsRes = await fetch("/api/students/jobs")
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        // Expecting { jobs: JobWithMapping[] }
        setJobs(jobsData.jobs || [])
        console.log("Fetched jobs:", jobsData.jobs)
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
  const handleUpdateProfile = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()
    setUpdatingProfile(true)

    try {
      const res = await fetch(
        "/api/students/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: editName.trim(),

            dob: editDob,

            address: editAddress.trim(),

            phone: editPhone.trim(),

            enrollment_no: editEnrollmentNo.trim(),

            bio: editBio.trim(),

            cgpa: Number(editCgpa),

            active_backlogs:
              Number(editBacklogs),

            semester:
              Number(editSemester),

            branch:
              editBranch.trim(),

            skills: editSkills
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),

            hobbies: editHobbies
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),

            resume_url:
              editResumeUrl.trim(),

            marksheet_url:
              editMarksheetUrl.trim(),

            social_links:
              editSocialLinks,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to update profile"
        )
      }

      alert(
        "Profile updated successfully. Your profile is now pending mentor verification."
      )

      await fetchData(true)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred"
      )
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Apply to Job
  // Note: mappingId can be null if no approved mapping exists for the student's college
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
      if (err instanceof Error) { alert(err.message) } else { alert("An unexpected error occurred") }
    }
  }

  // Start AI Mock Prep interview
  const handleStartMock = async () => {
    if (!targetRole.trim()) return
    setScoringMock(true)
    try {
      // Step 1: Create mock interview (status defaults to REQUESTED)
      const res = await fetch("/api/students/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRoleContext: targetRole })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start mock")

      const mock = data.mockInterview
      setActiveMock(mock)

      // Step 2: Trigger processing of queued mock interviews
      await fetch("/api/mock-interviews/process", { method: "POST" })

      // Step 3: Status-driven polling with backoff
      // States where we should continue polling: QUEUED, PROCESSING
      // States where we should stop: ANSWERING, FAILED, EVALUATED, COMPLETED
      const pollStates = new Set(["QUEUED", "PROCESSING"])

      // Backoff sequence: 1s, 2s, 3s, 5s, 8s, 10s, 10s, ...
      const backoffSequence = [1000, 2000, 3000, 5000, 8000, 10000, 10000]

      let sequenceIndex = 0

      const poll = async (): Promise<MockInterview | null> => {
        // Check current active mock status
        if (!activeMock) return null

        const currentStatus = activeMock.status

        // Stop polling if we reached a terminal state
        if (!pollStates.has(currentStatus)) {
          // Terminal state reached - return the mock
          return activeMock
        }

        // Don't poll past the maximum duration
        if (sequenceIndex >= backoffSequence.length) {
          console.log("[Mock] Poll maximum attempts reached")
          return null
        }

        const delayMs = backoffSequence[sequenceIndex]
        sequenceIndex++

        try {
          const freshRes = await fetch("/api/students/mock-interviews")
          const freshData = await freshRes.json()
          const found = (freshData.mockInterviews || []).find(
            (m: any) => m.id === activeMock!.id
          )

          if (found) {
            // Update activeMock with latest state from server
            setActiveMock(found)
          }

          // If we reached ANSWERING, stop polling and return
          if (found && found.status === "ANSWERING") {
            return found
          }

          // If we reached FAILED, stop polling
          if (found && found.status === "FAILED") {
            console.log("[Mock] Interview failed during polling")
            setActiveMock(found)
            return found
          }

          // If we reached EVALUATED, stop polling
          if (found && found.status === "EVALUATED") {
            console.log("[Mock] Interview evaluated during polling")
            setActiveMock(found)
            return found
          }

          // Continue polling with backoff
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          return poll()
        } catch (pollError) {
          console.error("[Mock] Poll error:", pollError)
          return null
        }
      }

      const completedMock = await poll()

      // Critical fix: Never fall back to an interview with zero questions
      // If completedMock is null (timeout/max attempts) and activeMock has questions, keep activeMock
      // If activeMock has no questions, show a helpful message
      if (!completedMock) {
        // Polling timed out - check if we already have mock data
        // If activeMock has questions, we can use it
        if (activeMock && activeMock.questions && activeMock.questions.length > 0) {
          console.log("[Mock] Using active mock from creation, questions ready")
          setActiveMock(activeMock)
        } else {
          console.log("[Mock] Polling timed out, interview still processing")
          // Don't setActiveMock with empty questions - show preparing state instead
          setActiveMock(null)
        }
        setMockAnswers(new Array(0).fill(""))
      } else {
        setActiveMock(completedMock)
        setMockAnswers(
          new Array(completedMock.questions?.length || 0).fill("")
        )
      }
    } catch (err) {
      console.error("[Mock Start] Error:", err)
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setScoringMock(false)
    }
  }

  // Complete and score AI Mock interview
  const handleCompleteMock = async (
    answersOverride?: string[]
  ) => {
    if (!activeMock) return

    const answersToSubmit =
      answersOverride ?? mockAnswers

    if (
      answersToSubmit.length !== activeMock.questions.length ||
      answersToSubmit.some((ans) => !ans.trim())
    ) {
      alert(
        "Please provide an answer for all mock interview questions."
      )
      return
    }

    setScoringMock(true)

    try {
      const answersPayload = activeMock.questions.map(
        (q, idx) => ({
          questionId: q.id,
          answer: answersToSubmit[idx].trim(),
        })
      )

      const res = await fetch(
        `/api/students/mock-interviews/${activeMock.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: answersPayload,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to score interview"
        )
      }

      alert(
        "AI Mock Interview completed and scored successfully!"
      )

      setMockAnswers(answersToSubmit)
      setActiveMock(null)

      await fetchData(true)
    } catch (err) {
      console.error("[Mock Complete] Error:", err)
      alert(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred"
      )
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