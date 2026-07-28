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

  handleUpdateStudentStatus: (
    studentId: string,
    status: "APPROVED" | "REJECTED"
  ) => Promise<void>
}

const MentorContext =
  React.createContext<MentorContextType | undefined>(
    undefined
  )

export function MentorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  // Keep one client instance for this provider.
  const supabase = React.useMemo(
    () => createClient(),
    []
  )

  const [loading, setLoading] =
    React.useState(true)

  const [refreshing, setRefreshing] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  const [students, setStudents] =
    React.useState<Student[]>([])

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = React.useState<string | null>(null)

  const [filterStatus, setFilterStatus] =
    React.useState("")

  // -------------------------------------------------------
  // Fetch dashboard data
  // -------------------------------------------------------

  const fetchData = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        // -----------------------------------------------
        // Check session
        // -----------------------------------------------

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace("/login")
          return
        }

        // -----------------------------------------------
        // Fetch students
        //
        // Server API handles mentor authorization.
        // -----------------------------------------------

        const params = new URLSearchParams()

        if (filterStatus) {
          params.set("status", filterStatus)
        }

        const query = params.toString()

        const url = query
          ? `/api/mentors/students?${query}`
          : "/api/mentors/students"

        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
        })

        // Read response BEFORE checking response.ok.
        const data = await response
          .json()
          .catch(() => null)

        if (!response.ok) {
          const message =
            data?.error ||
            `Failed to fetch students (${response.status})`

          console.error(
            "Mentor students API failed:",
            {
              status: response.status,
              statusText: response.statusText,
              error: message,
              response: data,
            }
          )

          if (response.status === 401) {
            router.replace("/login")
            return
          }

          throw new Error(message)
        }

        const fetchedStudents: Student[] =
          data?.students ?? []

        setStudents(fetchedStudents)

        // -----------------------------------------------
        // Selected student
        // -----------------------------------------------

        setSelectedStudentId(
          (currentStudentId) => {
            if (
              currentStudentId &&
              fetchedStudents.some(
                (student) =>
                  student.id ===
                  currentStudentId
              )
            ) {
              return currentStudentId
            }

            return (
              fetchedStudents[0]?.id ?? null
            )
          }
        )
      } catch (err) {
        console.error(
          "Mentor dashboard fetch failed:",
          err
        )

        setStudents([])

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong loading dashboard data"
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      router,
      supabase,
      filterStatus,
    ]
  )

  // -------------------------------------------------------
  // Initial fetch + filter changes
  // -------------------------------------------------------

  React.useEffect(() => {
    void fetchData()
  }, [fetchData])

  // -------------------------------------------------------
  // Update student status
  // -------------------------------------------------------

  const handleUpdateStudentStatus =
    React.useCallback(
      async (
        studentId: string,
        status: "APPROVED" | "REJECTED"
      ) => {
        try {
          const response = await fetch(
            `/api/mentors/students/${studentId}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                profile_status: status,
              }),
            }
          )

          const data = await response
            .json()
            .catch(() => null)

          if (!response.ok) {
            throw new Error(
              data?.error ||
                `Failed to update profile status (${response.status})`
            )
          }

          await fetchData(true)
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "An unexpected error occurred"

          console.error(
            "Student status update failed:",
            err
          )

          alert(message)
        }
      },
      [fetchData]
    )

  // -------------------------------------------------------
  // Context
  // -------------------------------------------------------

  const value =
    React.useMemo<MentorContextType>(
      () => ({
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
      }),
      [
        loading,
        refreshing,
        error,
        students,
        selectedStudentId,
        filterStatus,
        fetchData,
        handleUpdateStudentStatus,
      ]
    )

  return (
    <MentorContext.Provider value={value}>
      {children}
    </MentorContext.Provider>
  )
}

export function useMentor() {
  const context =
    React.useContext(MentorContext)

  if (!context) {
    throw new Error(
      "useMentor must be used within MentorProvider"
    )
  }

  return context
}