"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface JobPosting {
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

export interface Applicant {
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

interface CompanyContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  jobs: JobPosting[]
  companyStatus: string
  selectedJob: JobPosting | null
  setSelectedJob: (job: JobPosting | null) => void
  applicants: Applicant[]

  // New Job Form fields
  jobTitle: string
  setJobTitle: (v: string) => void
  jobDesc: string
  setJobDesc: (v: string) => void
  jobLocation: string
  setJobLocation: (v: string) => void
  workMode: "ONSITE" | "REMOTE" | "HYBRID"
  setWorkMode: (v: "ONSITE" | "REMOTE" | "HYBRID") => void
  ctc: string
  setCtc: (v: string) => void
  minCgpa: string
  setMinCgpa: (v: string) => void
  maxBacklogs: string
  setMaxBacklogs: (v: string) => void
  requireMock: boolean
  setRequireMock: (v: boolean) => void
  mockPassScore: string
  setMockPassScore: (v: string) => void
  branches: string[]
  setBranches: (v: string[]) => void
  postingJob: boolean

  // Bulk selection state
  selectedApplicantIds: Record<string, boolean>
  setSelectedApplicantIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>

  // Offer extend field
  extendCtcValues: Record<string, string>
  setExtendCtcValues: React.Dispatch<React.SetStateAction<Record<string, string>>>

  fetchData: (isRefresh?: boolean) => Promise<void>
  fetchApplicants: () => Promise<void>
  handleCreateJob: (e: React.FormEvent) => Promise<void>
  handleShortlistApplicant: (appId: string) => Promise<void>
  handleBulkShortlist: () => Promise<void>
  handleExtendOffer: (appId: string) => Promise<void>
  handleRevokeOffer: (offerId: string) => Promise<void>
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Data state
  const [jobs, setJobs] = React.useState<JobPosting[]>([])
  const [companyStatus, setCompanyStatus] = React.useState<string>("PENDING")
  const [selectedJob, setSelectedJob] = React.useState<JobPosting | null>(null)
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
        if (!selectedJob) {
          setSelectedJob(jobsData.jobs[0])
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase, selectedJob])

  // Fetch applicants whenever selectedJobId changes
  const fetchApplicants = React.useCallback(async () => {
    if (!selectedJob) {
      setApplicants([])
      return
    }
    try {
      const res = await fetch(`/api/company/jobs/${selectedJob?.id}/applicants`)
      if (res.ok) {
        const data = await res.json()
        setApplicants(data.applicants || [])
        setSelectedApplicantIds({})
      }
    } catch (err) {
      console.error("Error fetching applicants:", err)
    }
  }, [selectedJob])

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
      router.push("/company/jobs")
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

  return (
    <CompanyContext.Provider
      value={{
        loading,
        refreshing,
        error,
        jobs,
        companyStatus,
        selectedJob,
        setSelectedJob,
        applicants,
        jobTitle,
        setJobTitle,
        jobDesc,
        setJobDesc,
        jobLocation,
        setJobLocation,
        workMode,
        setWorkMode,
        ctc,
        setCtc,
        minCgpa,
        setMinCgpa,
        maxBacklogs,
        setMaxBacklogs,
        requireMock,
        setRequireMock,
        mockPassScore,
        setMockPassScore,
        branches,
        setBranches,
        postingJob,
        selectedApplicantIds,
        setSelectedApplicantIds,
        extendCtcValues,
        setExtendCtcValues,
        fetchData,
        fetchApplicants,
        handleCreateJob,
        handleShortlistApplicant,
        handleBulkShortlist,
        handleExtendOffer,
        handleRevokeOffer,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = React.useContext(CompanyContext)
  if (!context) throw new Error("useCompany must be used within CompanyProvider")
  return context
}
