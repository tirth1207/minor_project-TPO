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

export interface Organization {
  id: string
  name: string
  status: "PENDING" | "ACTIVE" | "REJECTED"
  created_at: string
  departments?: Department[]
}

export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  website: string | null
  status: "PENDING" | "ACTIVE" | "REJECTED"
}

export interface JobPosting {
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

export interface Stats {
  organizations: { total: number; active: number; pending: number; rejected: number }
  companies: { total: number; active: number; pending: number; rejected: number }
  jobs: { total: number; active: number; pending: number; rejected: number }
  students: { total: number; placed: number; unplaced: number }
}

interface SuperAdminContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  stats: Stats | null
  organizations: Organization[]
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>
  companies: CompanyProfile[]
  setCompanies: React.Dispatch<React.SetStateAction<CompanyProfile[]>>
  jobs: JobPosting[]
  setJobs: React.Dispatch<React.SetStateAction<JobPosting[]>>

  // Form states
  newCollegeName: string
  setNewCollegeName: (v: string) => void
  newDeptName: string
  setNewDeptName: (v: string) => void
  selectedCollegeForDept: string
  setSelectedCollegeForDept: (v: string) => void
  creatingCollege: boolean
  creatingDept: boolean

  // Row expand
  expandedCollegeIds: Record<string, boolean>
  toggleCollegeExpand: (id: string) => void

  fetchData: (isRefresh?: boolean) => Promise<void>
  handleUpdateOrgStatus: (orgId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => Promise<void>
  handleDeleteOrg: (orgId: string) => Promise<void>
  handleUpdateDeptStatus: (deptId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => Promise<void>
  handleUpdateCompanyStatus: (companyId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => Promise<void>
  handleUpdateJobStatus: (jobId: string, status: "APPROVED" | "PENDING" | "REJECTED") => Promise<void>
  handleCreateCollege: (e: React.FormEvent) => Promise<void>
  handleCreateDept: (e: React.FormEvent) => Promise<void>
  notifications : () => Promise<void>
}

const SuperAdminContext = React.createContext<SuperAdminContextType | undefined>(undefined)

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [stats, setStats] = React.useState<Stats | null>(null)
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [companies, setCompanies] = React.useState<CompanyProfile[]>([])
  const [jobs, setJobs] = React.useState<JobPosting[]>([])

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
      const statsData = await statsRes.json()
      if (!statsRes.ok) {
        throw new Error(statsData.error || "Failed to fetch stats")
      }
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
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])
  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleUpdateOrgStatus = async (orgId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => {
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error("Failed to update college status")

      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, status } : o))
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

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

  const handleUpdateDeptStatus = async (deptId: string, status: "ACTIVE" | "PENDING" | "REJECTED") => {
    try {
      const res = await fetch(`/api/super-admin/departments/${deptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error("Failed to update department status")

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

  return (
    <SuperAdminContext.Provider
      value={{
        loading,
        refreshing,
        error,
        stats,
        organizations,
        setOrganizations,
        companies,
        setCompanies,
        jobs,
        setJobs,
        newCollegeName,
        setNewCollegeName,
        newDeptName,
        setNewDeptName,
        selectedCollegeForDept,
        setSelectedCollegeForDept,
        creatingCollege,
        creatingDept,
        expandedCollegeIds,
        toggleCollegeExpand,
        fetchData,
        handleUpdateOrgStatus,
        handleDeleteOrg,
        handleUpdateDeptStatus,
        handleUpdateCompanyStatus,
        handleUpdateJobStatus,
        handleCreateCollege,
        handleCreateDept,
        notifications
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  )
}

export function useSuperAdmin() {
  const context = React.useContext(SuperAdminContext)
  if (!context) throw new Error("useSuperAdmin must be used within SuperAdminProvider")
  return context
}
