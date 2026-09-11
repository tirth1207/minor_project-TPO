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
  applicant_count: number
  applications_count: number
  branches: string[]
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
  job_college_mapping?: {
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
      global_status: "PENDING" | "APPROVED" | "REJECTED"
      require_mock: boolean
      mock_pass_score: number
      applicant_count: number
      applications_count: number
      branches: string[]
    }
    college?: {
      id: string
      name: string
      description: string
      location: string
      website: string
      logo_url: string
    }
  }
}

export interface Offer {
  id: string
  application_id: string
  ctc_offered: number
  status: OfferStatus
  extended_at: string
  decided_at: string | null
}

export type OfferStatus = "EXTENDED" | "ACCEPTED" | "REJECTED"

export interface OfferWithApplication extends Offer {
  application: {
    id: string
    status: string
    applied_at: string
    mock_score: number | null
    job_college_mapping: {
      id: string
      job: { id: string; title: string; company_id: string }
    }
    student: {
      id: string
      name: string
      enrollment_no: string
      branch: string
      cgpa: number
      active_backlogs: number
      resume_url: string
    } | null
  }
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
  offers: Offer[]
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
  selectedApplicantIds: Record<string, boolean>
  setSelectedApplicantIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  extendCtcValues: Record<string, string>
  setExtendCtcValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fetchData: (isRefresh?: boolean) => Promise<void>
  fetchApplicants: () => Promise<void>
  handleCreateJob: (e: React.FormEvent) => Promise<void>
  handleShortlistApplicant: (appId: string) => Promise<void>
  handleBulkShortlist: () => Promise<void>
  handleExtendOffer: (appId: string) => Promise<void>
  handleRevokeOffer: (offerId: string) => Promise<void>
  allApplicants: Applicant[]
  fetchAllApplicants: () => Promise<void>
}

const CompanyContext = React.createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [jobs, setJobs] = React.useState<JobPosting[]>([])
  const [companyStatus, setCompanyStatus] = React.useState<string>("PENDING")
  const [selectedJob, setSelectedJob] = React.useState<JobPosting | null>(null)
  const [applicants, setApplicants] = React.useState<Applicant[]>([])
  const [allApplicants, setAllApplicants] = React.useState<Applicant[]>([])
  const [offers, setOffers] = React.useState<Offer[]>([])
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
  const [selectedApplicantIds, setSelectedApplicantIds] = React.useState<Record<string, boolean>>({})
  const [extendCtcValues, setExtendCtcValues] = React.useState<Record<string, string>>({})

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
      if (role !== "COMPANY") {
        router.push("/unauthorized")
        return
      }

      const jobsRes = await fetch("/api/company/jobs")
      if (!jobsRes.ok) throw new Error("Failed to retrieve jobs")
      const jobsData = await jobsRes.json()
      setJobs(jobsData.jobs || [])
      setCompanyStatus(jobsData.company_status || "PENDING")

      if (jobsData.jobs && jobsData.jobs.length > 0 && !selectedJob) {
        setSelectedJob(jobsData.jobs[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase, selectedJob])

  const fetchApplicants = React.useCallback(async () => {
    if (!selectedJob) {
      setApplicants([])
      return
    }
    try {
      const res = await fetch(`/api/company/jobs/${selectedJob.id}/applicants`)
      if (res.ok) {
        const data = await res.json()
        setApplicants(data.applicants || [])
        setSelectedApplicantIds({})
      }
    } catch (err) {
      console.error("Error fetching applicants:", err)
    }
  }, [selectedJob])

  const fetchAllApplicants = React.useCallback(async () => {
    try {
      const res = await fetch("/api/company/applications", { method: "GET", cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setAllApplicants([])
        return
      }
      setAllApplicants(Array.isArray(data?.applicants) ? data.applicants : [])
    } catch {
      setAllApplicants([])
    }
  }, [])

  const fetchOffers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/company/offers?limit=50&offset=0", { method: "GET", cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setOffers([])
        return
      }
      const rows = Array.isArray(data?.offers) ? data.offers : data?.applicants
      setOffers(Array.isArray(rows) ? rows : [])
    } catch {
      setOffers([])
    }
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])
  React.useEffect(() => { fetchApplicants() }, [fetchApplicants])
  React.useEffect(() => { fetchAllApplicants() }, [fetchAllApplicants])
  React.useEffect(() => { fetchOffers() }, [fetchOffers])

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
        body: JSON.stringify({ title: jobTitle, description: jobDesc, location: jobLocation, workMode, package: ctc, minCgpa, maxBacklogs, requireMock, mockPassScore, branches: branches.length > 0 ? branches : ["Computer Science", "Information Technology", "Electronics"] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create job")
      setJobTitle("")
      setJobDesc("")
      setJobLocation("")
      setCtc("")
      setMinCgpa("6.00")
      setMaxBacklogs("0")
      setRequireMock(false)
      setMockPassScore("50")
      setBranches([])
      await fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create job")
    } finally {
      setPostingJob(false)
    }
  }

  const handleShortlistApplicant = async (appId: string) => {
    const res = await fetch("/api/company/applications/shortlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationIds: [appId] }) })
    if (!res.ok) throw new Error("Failed to shortlist applicant")
    await Promise.all([fetchApplicants(), fetchAllApplicants()])
  }

  const handleBulkShortlist = async () => {
    const ids = Object.entries(selectedApplicantIds).filter(([, selected]) => selected).map(([id]) => id)
    if (ids.length === 0) return
    const res = await fetch("/api/company/applications/shortlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationIds: ids }) })
    if (!res.ok) throw new Error("Failed to shortlist applicants")
    setSelectedApplicantIds({})
    await Promise.all([fetchApplicants(), fetchAllApplicants()])
  }

  const handleExtendOffer = async (appId: string) => {
    const ctcOffered = extendCtcValues[appId]
    if (!ctcOffered) return
    const res = await fetch(`/api/company/applications/${appId}/offer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ctcOffered: Number(ctcOffered) }) })
    if (!res.ok) throw new Error("Failed to extend offer")
    setExtendCtcValues((current) => ({ ...current, [appId]: "" }))
    await fetchOffers()
  }

  const handleRevokeOffer = async (offerId: string) => {
    const res = await fetch(`/api/company/offers/${offerId}/revoke`, { method: "PATCH" })
    if (!res.ok) throw new Error("Failed to revoke offer")
    await fetchOffers()
  }

  return <CompanyContext.Provider value={{ loading, refreshing, error, jobs, companyStatus, selectedJob, setSelectedJob, applicants, offers, jobTitle, setJobTitle, jobDesc, setJobDesc, jobLocation, setJobLocation, workMode, setWorkMode, ctc, setCtc, minCgpa, setMinCgpa, maxBacklogs, setMaxBacklogs, requireMock, setRequireMock, mockPassScore, setMockPassScore, branches, setBranches, postingJob, selectedApplicantIds, setSelectedApplicantIds, extendCtcValues, setExtendCtcValues, fetchData, fetchApplicants, handleCreateJob, handleShortlistApplicant, handleBulkShortlist, handleExtendOffer, handleRevokeOffer, allApplicants, fetchAllApplicants }}>{children}</CompanyContext.Provider>
}

export function useCompany() {
  const context = React.useContext(CompanyContext)
  if (!context) throw new Error("useCompany must be used within CompanyProvider")
  return context
}
