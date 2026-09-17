import { describe, it, expect, vi, beforeEach } from "vitest"
import { requireUser } from "../../src/lib/auth/require-user"
import { requireApprovedStudent } from "../../src/lib/auth/require-approved-student"
import { requireActiveCollegeAdmin } from "../../src/lib/auth/require-active-college-admin"
import { requireActiveCompany } from "../../src/lib/auth/require-active-company"
import { requireActiveMentor } from "../../src/lib/auth/require-active-mentor"
import { requireSuperAdmin } from "../../src/lib/auth/require-super-admin"

const mockCreateClient = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}))

function createMockSupabase(
  user: { id: string; app_metadata?: Record<string, any> } | null,
  authError: any = null,
  tableResponses: Record<string, { data?: any; error?: any }> = {}
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      const resp = tableResponses[tableName] || { data: null, error: null }
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(resp),
      }
      return chain
    }),
  }
}

describe("Authentication & Authorization Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("requireUser", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null, new Error("No session")))
      const res = await requireUser()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(401)
        expect(res.error).toBe("Unauthorized")
      }
    })

    it("should return 500 if database fails fetching user metadata", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { error: new Error("DB fail") } }
        )
      )
      const res = await requireUser()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(500)
        expect(res.error).toContain("Database error retrieving user metadata")
      }
    })

    it("should return ok: true when user is authenticated", async () => {
      const mockSupabase = createMockSupabase(
        { id: "user-1" },
        null,
        { users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } } }
      )
      mockCreateClient.mockResolvedValue(mockSupabase)
      const res = await requireUser()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.user.id).toBe("user-1")
        expect(res.dbUser?.role).toBe("STUDENT")
      }
    })
  })

  describe("requireApprovedStudent", () => {
    it("should return 401 if not authenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null))
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
    })

    it("should return 403 if role is not STUDENT or orgId/deptId is missing", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { role: "MENTOR", org_id: "org-1", dept_id: "dept-1" } } }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("Student access only")
      }
    })

    it("should fallback to user.app_metadata if dbUser is missing/null", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1", app_metadata: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
          null,
          {
            users: { data: null },
            student_profiles: { data: { id: "sp-1", profile_status: "APPROVED", name: "Alice" } },
            organizations: { data: { id: "org-1", status: "ACTIVE" } },
            departments: { data: { id: "dept-1", status: "ACTIVE" } },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.studentId).toBe("sp-1")
      }
    })

    it("should return 500 if DB fails reading student profile", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { error: new Error("DB Query Error") },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(500)
        expect(res.error).toContain("Database error retrieving student profile")
      }
    })

    it("should return 404 if student profile is not found", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { data: null },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(404)
        expect(res.error).toContain("profile not found")
      }
    })

    it("should return 403 if student profile status is PENDING", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { data: { id: "sp-1", profile_status: "PENDING", name: "Alice" } },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("must be approved")
      }
    })

    it("should return 403 if organization is not active or DB errors", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { data: { id: "sp-1", profile_status: "APPROVED", name: "Alice" } },
            organizations: { data: { id: "org-1", status: "PENDING" } },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("organization is not active")
      }
    })

    it("should return 403 if department is not active", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { data: { id: "sp-1", profile_status: "APPROVED", name: "Alice" } },
            organizations: { data: { id: "org-1", status: "ACTIVE" } },
            departments: { data: { id: "dept-1", status: "SUSPENDED" } },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("department is not active")
      }
    })

    it("should authorize active approved student", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "STUDENT", org_id: "org-1", dept_id: "dept-1" } },
            student_profiles: { data: { id: "sp-1", profile_status: "APPROVED", name: "Alice" } },
            organizations: { data: { id: "org-1", status: "ACTIVE" } },
            departments: { data: { id: "dept-1", status: "ACTIVE" } },
          }
        )
      )
      const res = await requireApprovedStudent()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.studentId).toBe("sp-1")
        expect(res.orgId).toBe("org-1")
        expect(res.deptId).toBe("dept-1")
      }
    })
  })

  describe("requireActiveCollegeAdmin", () => {
    it("should return 401 when not authenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null))
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
    })

    it("should return 403 when user is not COLLEGE_ADMIN", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { role: "STUDENT", org_id: "org-1" } } }
        )
      )
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(403)
    })

    it("should return 500 when organization lookup encounters a DB error", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COLLEGE_ADMIN", org_id: "org-1" } },
            organizations: { error: new Error("DB Error") },
          }
        )
      )
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(500)
        expect(res.error).toContain("Database error retrieving organization")
      }
    })

    it("should return 403 when organization is not found", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COLLEGE_ADMIN", org_id: "org-1" } },
            organizations: { data: null },
          }
        )
      )
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("Associated organization not found")
      }
    })

    it("should return 403 when organization status is not ACTIVE", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COLLEGE_ADMIN", org_id: "org-1" } },
            organizations: { data: { id: "org-1", name: "Tech Univ", status: "PENDING" } },
          }
        )
      )
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("account is not active")
      }
    })

    it("should authorize active college admin", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COLLEGE_ADMIN", org_id: "org-1" } },
            organizations: { data: { id: "org-1", name: "Tech Univ", status: "ACTIVE" } },
          }
        )
      )
      const res = await requireActiveCollegeAdmin()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.orgId).toBe("org-1")
      }
    })
  })

  describe("requireActiveCompany", () => {
    it("should return 401 when unauthenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null))
      const res = await requireActiveCompany()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
    })

    it("should return 403 when role is not COMPANY", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { role: "STUDENT" } } }
        )
      )
      const res = await requireActiveCompany()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(403)
    })

    it("should return 500 when company profile lookup encounters a DB error", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COMPANY" } },
            company_profiles: { error: new Error("DB Error") },
          }
        )
      )
      const res = await requireActiveCompany()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(500)
        expect(res.error).toContain("Database error retrieving company profile")
      }
    })

    it("should return 404 when company profile is missing", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COMPANY" } },
            company_profiles: { data: null },
          }
        )
      )
      const res = await requireActiveCompany()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(404)
    })

    it("should return 403 when corporate account is not active", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COMPANY" } },
            company_profiles: { data: { id: "cp-1", status: "PENDING", company_name: "Acme" } },
          }
        )
      )
      const res = await requireActiveCompany()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("must be approved")
      }
    })

    it("should authorize active company", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { role: "COMPANY" } },
            company_profiles: { data: { id: "cp-1", status: "ACTIVE", company_name: "Acme" } },
          }
        )
      )
      const res = await requireActiveCompany()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.companyId).toBe("cp-1")
      }
    })
  })

  describe("requireActiveMentor", () => {
    it("should return 401 when unauthenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null))
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
    })

    it("should return 403 if public user record is missing", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: null } }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("Mentor user record not found")
      }
    })

    it("should return 403 if mentor is missing org_id or dept_id", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { id: "user-1", role: "MENTOR", org_id: null, dept_id: "dept-1" } } }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("not assigned to an organization")
      }
    })

    it("should return 403 when mentor profile status is PENDING", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { id: "user-1", role: "MENTOR", org_id: "org-1", dept_id: "dept-1" } },
            mentor_profiles: { data: { id: "m-1", profile_status: "PENDING" } },
          }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("awaiting approval")
      }
    })

    it("should return 403 when mentor profile status is REJECTED", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { id: "user-1", role: "MENTOR", org_id: "org-1", dept_id: "dept-1" } },
            mentor_profiles: { data: { id: "m-1", profile_status: "REJECTED" } },
          }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("rejected")
      }
    })

    it("should return 403 when department org_id mismatch", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { id: "user-1", role: "MENTOR", org_id: "org-1", dept_id: "dept-1" } },
            mentor_profiles: { data: { id: "m-1", profile_status: "APPROVED" } },
            organizations: { data: { id: "org-1", status: "ACTIVE" } },
            departments: { data: { id: "dept-1", status: "ACTIVE", org_id: "other-org" } },
          }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.error).toContain("does not belong to your organization")
      }
    })

    it("should authorize active approved mentor", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          {
            users: { data: { id: "user-1", role: "MENTOR", org_id: "org-1", dept_id: "dept-1" } },
            mentor_profiles: { data: { id: "m-1", profile_status: "APPROVED" } },
            organizations: { data: { id: "org-1", status: "ACTIVE" } },
            departments: { data: { id: "dept-1", status: "ACTIVE", org_id: "org-1" } },
          }
        )
      )
      const res = await requireActiveMentor()
      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.mentorId).toBe("m-1")
      }
    })
  })

  describe("requireSuperAdmin", () => {
    it("should return 401 when unauthenticated", async () => {
      mockCreateClient.mockResolvedValue(createMockSupabase(null))
      const res = await requireSuperAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(401)
    })

    it("should return 403 when role is not SA", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { role: "STUDENT" } } }
        )
      )
      const res = await requireSuperAdmin()
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.status).toBe(403)
    })

    it("should authorize Super Admin user", async () => {
      mockCreateClient.mockResolvedValue(
        createMockSupabase(
          { id: "user-1" },
          null,
          { users: { data: { role: "SA" } } }
        )
      )
      const res = await requireSuperAdmin()
      expect(res.ok).toBe(true)
    })
  })
})
