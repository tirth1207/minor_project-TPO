"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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
  phone: string | null
  bio: string | null
  user?: {
    department?: {
      name: string
    }
  }
}

interface MentorContextType {
  loading: boolean
  refreshing: boolean
  error: string | null
  students: Student[]
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  filterStatus: string
  setFilterStatus: (status: string) => void

  fetchData: (isRefresh?: boolean) => Promise<void>
  handleUpdateStudentStatus: (studentId: string, status: "APPROVED" | "REJECTED") => Promise<void>
}

const MentorContext = React.createContext<MentorContextType | undefined>(undefined)

export function MentorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Students list state
  const [students, setStudents] = React.useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null)
  const [filterStatus, setFilterStatus] = React.useState<string>("")

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
        .select("role, dept_id")
        .eq("id", user.id)
        .maybeSingle()

      const role = dbUser?.role || user.app_metadata?.role
      const dept_id = dbUser?.dept_id || user.app_metadata?.dept_id

      if (role !== "MENTOR" || !dept_id) {
        router.push("/unauthorized")
        return
      }

      // Fetch students belonging to the mentor's department
      const url = filterStatus ? `/api/mentors/students?status=${filterStatus}` : "/api/mentors/students"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch department students")

      const data = await res.json()
      const fetchedStudents = data.students || []
      setStudents(fetchedStudents)

      // Set first student as default selected if none selected
      if (fetchedStudents.length > 0) {
        if (!selectedStudentId || !fetchedStudents.some((s: any) => s.id === selectedStudentId)) {
          setSelectedStudentId(fetchedStudents[0].id)
        }
      } else {
        setSelectedStudentId(null)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong loading dashboard data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router, supabase, filterStatus, selectedStudentId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpdateStudentStatus = async (studentId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/mentors/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_status: status })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile status")

      alert(`Student profile status has been successfully set to ${status}!`)
      fetchData(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred")
    }
  }

  return (
    <MentorContext.Provider
      value={{
        loading,
        refreshing,
        error,
        students,
        selectedStudentId,
        setSelectedStudentId,
        filterStatus,
        setFilterStatus,
        fetchData,
        handleUpdateStudentStatus,
      }}
    >
      {children}
    </MentorContext.Provider>
  )
}

export function useMentor() {
  const context = React.useContext(MentorContext)
  if (!context) throw new Error("useMentor must be used within MentorProvider")
  return context
}
