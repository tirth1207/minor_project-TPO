"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export type ApprovalStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"

export interface Department {
  id: string
  name: string
  status: ApprovalStatus
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

  local_status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"

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

  profile_status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"

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

  orgStatus: ApprovalStatus
  isOrgActive: boolean

  deptName: string
  setDeptName: (value: string) => void
  submittingDept: boolean

  selectedDeptId: string
  setSelectedDeptId: (value: string) => void

  generatingInvite: boolean

  latestInviteUrl: string | null
  setLatestInviteUrl: (
    value: string | null
  ) => void

  fetchData: (
    isRefresh?: boolean
  ) => Promise<void>

  handleCreateDept: (
    event: React.FormEvent
  ) => Promise<void>

  handleGenerateInvite: (
    event: React.FormEvent
  ) => Promise<void>

  handleUpdateJobStatus: (
    mappingId: string,
    localStatus:
      | "APPROVED"
      | "REJECTED"
      | "PENDING"
  ) => Promise<void>

  handleCopyLink: (url: string) => void
}

const CollegeAdminContext =
  React.createContext<
    CollegeAdminContextType | undefined
  >(undefined)

export function CollegeAdminProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const supabase = React.useMemo(
    () => createClient(),
    []
  )

  // ---------------------------------------------------------
  // General state
  // ---------------------------------------------------------

  const [loading, setLoading] =
    React.useState(true)

  const [refreshing, setRefreshing] =
    React.useState(false)

  const [error, setError] =
    React.useState<string | null>(null)

  // ---------------------------------------------------------
  // Data
  // ---------------------------------------------------------

  const [departments, setDepartments] =
    React.useState<Department[]>([])

  const [invites, setInvites] =
    React.useState<InviteLink[]>([])

  const [jobMappings, setJobMappings] =
    React.useState<JobMapping[]>([])

  const [students, setStudents] =
    React.useState<Student[]>([])

  const [orgStatus, setOrgStatus] =
    React.useState<ApprovalStatus>("PENDING")

  const isOrgActive =
    orgStatus === "ACTIVE"

  // ---------------------------------------------------------
  // Department form
  // ---------------------------------------------------------

  const [deptName, setDeptName] =
    React.useState("")

  const [
    submittingDept,
    setSubmittingDept,
  ] = React.useState(false)

  // ---------------------------------------------------------
  // Invite form
  // ---------------------------------------------------------

  const [
    selectedDeptId,
    setSelectedDeptId,
  ] = React.useState("")

  const [
    generatingInvite,
    setGeneratingInvite,
  ] = React.useState(false)

  const [
    latestInviteUrl,
    setLatestInviteUrl,
  ] = React.useState<string | null>(null)

  // ---------------------------------------------------------
  // Clear protected dashboard data
  // ---------------------------------------------------------

  const clearProtectedData =
    React.useCallback(() => {
      setDepartments([])
      setInvites([])
      setJobMappings([])
      setStudents([])

      setSelectedDeptId("")
      setLatestInviteUrl(null)
    }, [])

  // ---------------------------------------------------------
  // Read JSON response safely
  // ---------------------------------------------------------

  const readResponse = async (
    response: Response
  ) => {
    const data = await response
      .json()
      .catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.error ||
          `Request failed (${response.status})`
      )
    }

    return data
  }

  // ---------------------------------------------------------
  // Approval guard for client actions
  // ---------------------------------------------------------

  const requireActiveOrganization = () => {
    if (orgStatus === "ACTIVE") {
      return true
    }

    if (orgStatus === "PENDING") {
      alert(
        "Your institute is awaiting approval. Dashboard actions will become available after approval."
      )

      return false
    }

    if (orgStatus === "REJECTED") {
      alert(
        "Your institute registration was rejected. Contact the administrator before using dashboard features."
      )

      return false
    }

    alert(
      "Your institute is not currently allowed to perform this action."
    )

    return false
  }

  // ---------------------------------------------------------
  // Fetch dashboard
  // ---------------------------------------------------------

  const fetchData = React.useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      try {
        // -------------------------------------------------
        // Authenticate
        // -------------------------------------------------

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          clearProtectedData()

          router.replace("/login")
          return
        }

        // -------------------------------------------------
        // Authorize role
        // -------------------------------------------------

        const {
          data: dbUser,
          error: userError,
        } = await supabase
          .from("users")
          .select("role, org_id")
          .eq("id", user.id)
          .maybeSingle()

        if (userError) {
          throw new Error(userError.message)
        }

        if (!dbUser) {
          clearProtectedData()

          router.replace("/unauthorized")
          return
        }

        const role =
          dbUser.role ??
          user.app_metadata?.role

        const orgId =
          dbUser.org_id ??
          user.app_metadata?.org_id

        if (
          role !== "COLLEGE_ADMIN" ||
          !orgId
        ) {
          clearProtectedData()

          router.replace("/unauthorized")
          return
        }

        // -------------------------------------------------
        // Organization status
        //
        // This is intentionally loaded BEFORE anything
        // else.
        // -------------------------------------------------

        const statusResponse = await fetch(
          "/api/college-admin/status",
          {
            cache: "no-store",
          }
        )

        const statusData =
          await readResponse(statusResponse)

        const status =
          statusData.org?.status as
            | ApprovalStatus
            | undefined

        if (
          !status ||
          ![
            "PENDING",
            "ACTIVE",
            "REJECTED",
          ].includes(status)
        ) {
          throw new Error(
            "Invalid organization status"
          )
        }

        setOrgStatus(status)

        // -------------------------------------------------
        // IMPORTANT
        //
        // Pending/rejected organization stops here.
        // Do not request departments, students,
        // invitations or jobs.
        // -------------------------------------------------

        if (status !== "ACTIVE") {
          clearProtectedData()
          return
        }

        // -------------------------------------------------
        // Organization is ACTIVE.
        // Load dashboard resources.
        // -------------------------------------------------

        const [
          departmentsResponse,
          invitesResponse,
          jobsResponse,
          studentsResponse,
        ] = await Promise.all([
          fetch(
            "/api/college-admin/departments",
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/api/college-admin/invites",
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/api/college-admin/jobs",
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/api/college-admin/students",
            {
              cache: "no-store",
            }
          ),
        ])

        const [
          departmentsData,
          invitesData,
          jobsData,
          studentsData,
        ] = await Promise.all([
          readResponse(departmentsResponse),
          readResponse(invitesResponse),
          readResponse(jobsResponse),
          readResponse(studentsResponse),
        ])

        setDepartments(
          departmentsData.departments ?? []
        )

        setInvites(
          invitesData.invites ?? []
        )

        setJobMappings(
          jobsData.mappings ?? []
        )

        setStudents(
          studentsData.students ?? []
        )
      } catch (err) {
        console.error(
          "College dashboard error:",
          err
        )

        clearProtectedData()

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
      clearProtectedData,
    ]
  )

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // ---------------------------------------------------------
  // Create department
  // ---------------------------------------------------------

  const handleCreateDept = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    if (!requireActiveOrganization()) {
      return
    }

    const name = deptName.trim()

    if (!name) {
      alert("Department name is required.")
      return
    }

    setSubmittingDept(true)

    try {
      const response = await fetch(
        "/api/college-admin/departments",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
          }),
        }
      )

      const data =
        await readResponse(response)

      setDeptName("")

      alert(
        data.message ||
          "Department created successfully."
      )

      await fetchData(true)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to create department"
      )
    } finally {
      setSubmittingDept(false)
    }
  }

  // ---------------------------------------------------------
  // Generate invite
  // ---------------------------------------------------------

  const handleGenerateInvite = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    if (!requireActiveOrganization()) {
      return
    }

    if (!selectedDeptId) {
      alert(
        "Please select a department."
      )

      return
    }

    /*
     * Optional client-side protection.
     * Backend MUST verify this too.
     */

    const department =
      departments.find(
        (item) =>
          item.id === selectedDeptId
      )

    if (!department) {
      alert(
        "Selected department was not found."
      )

      return
    }

    if (department.status !== "ACTIVE") {
      alert(
        "Student invitations can only be created for approved departments."
      )

      return
    }

    setGeneratingInvite(true)
    setLatestInviteUrl(null)

    try {
      const response = await fetch(
        "/api/college-admin/invites",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            departmentId:
              selectedDeptId,
          }),
        }
      )

      const data =
        await readResponse(response)

      if (!data.inviteUrl) {
        throw new Error(
          "Invite URL was not returned by the server"
        )
      }

      const absoluteUrl =
        `${window.location.origin}${data.inviteUrl}`

      setLatestInviteUrl(absoluteUrl)

      alert(
        "Invite link generated successfully."
      )

      await fetchData(true)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to generate invite"
      )
    } finally {
      setGeneratingInvite(false)
    }
  }

  // ---------------------------------------------------------
  // Update job mapping
  // ---------------------------------------------------------

  const handleUpdateJobStatus = async (
    mappingId: string,
    localStatus:
      | "APPROVED"
      | "REJECTED"
      | "PENDING"
  ) => {
    if (!requireActiveOrganization()) {
      return
    }

    if (!mappingId) {
      alert("Invalid job mapping.")
      return
    }

    try {
      const response = await fetch(
        `/api/college-admin/jobs/${mappingId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            localStatus,
          }),
        }
      )

      const data =
        await readResponse(response)

      alert(
        data.message ||
          `Job successfully ${localStatus.toLowerCase()}.`
      )

      await fetchData(true)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update job status"
      )
    }
  }

  // ---------------------------------------------------------
  // Copy invitation
  // ---------------------------------------------------------

  const handleCopyLink = async (
    url: string
  ) => {
    if (!requireActiveOrganization()) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        url
      )

      alert(
        "Invite link copied to clipboard."
      )
    } catch {
      alert(
        "Unable to copy the invite link."
      )
    }
  }

  // ---------------------------------------------------------
  // Provider
  // ---------------------------------------------------------

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

        orgStatus,
        isOrgActive,

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
  const context =
    React.useContext(
      CollegeAdminContext
    )

  if (!context) {
    throw new Error(
      "useCollegeAdmin must be used within CollegeAdminProvider"
    )
  }

  return context
}