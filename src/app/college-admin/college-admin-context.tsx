"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface Department {
  id: string
  name: string
  status: "PENDING" | "ACTIVE" | "REJECTED"
  created_at: string
}

export interface InviteLink {
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

export interface JobMapping {
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

export interface Student {
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

interface CollegeAdminContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  departments: Department[]
  invites: InviteLink[]
  jobMappings: JobMapping[]
  students: Student[]

  // Form states
  deptName: string
  setDeptName: (v: string) => void
  submittingDept: boolean
  selectedDeptId: string
  setSelectedDeptId: (v: string) => void
  generatingInvite: boolean
  latestInviteUrl: string | null
  setLatestInviteUrl: (v: string | null) => void

  fetchData: (isRefresh?: boolean) => Promise<void>
  handleCreateDept: (e: React.FormEvent) => Promise<void>
  handleGenerateInvite: (e: React.FormEvent) => Promise<void>
  handleUpdateJobStatus: (mappingId: string, localStatus: "APPROVED" | "REJECTED" | "PENDING") => Promise<void>
  handleCopyLink: (url: string) => void
}

const CollegeAdminContext = React.createContext<CollegeAdminContextType | undefined>(undefined)

export function CollegeAdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

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

  return (
    <CollegeAdminContext.Provider
      value={{
        loading,
        refreshing,
        error,
        departments,
        invites,
        jobMappings,
        students,
        deptName,
        setDeptName,
        submittingDept,
        selectedDeptId,
        setSelectedDeptId,
        generatingInvite,
        latestInviteUrl,
        setLatestInviteUrl,
        fetchData,
        handleCreateDept,
        handleGenerateInvite,
        handleUpdateJobStatus,
        handleCopyLink,
      }}
    >
      {children}
    </CollegeAdminContext.Provider>
  )
}

export function useCollegeAdmin() {
  const context = React.useContext(CollegeAdminContext)
  if (!context) throw new Error("useCollegeAdmin must be used within CollegeAdminProvider")
  return context
}
