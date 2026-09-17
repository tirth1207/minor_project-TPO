import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET as getNotifications, PATCH as patchNotifications } from "../../src/app/api/notifications/route"
import { PATCH as patchSingleNotification, DELETE as deleteSingleNotification } from "../../src/app/api/notifications/[id]/route"
import { requireUser } from "../../src/lib/auth/require-user"

vi.mock("../../src/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}))

describe("Notification API Endpoint Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /api/notifications", () => {
    it("should return auth status code if requireUser fails", async () => {
      vi.mocked(requireUser).mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" })

      const req = new Request("http://localhost/api/notifications")
      const res = await getNotifications(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
    })

    it("should reject limit < 1 or > 100 with 400", async () => {
      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: {} as any,
      })

      const reqLow = new Request("http://localhost/api/notifications?limit=0")
      const resLow = await getNotifications(reqLow)
      expect(resLow.status).toBe(400)
      const dataLow = await resLow.json()
      expect(dataLow.error).toContain("limit must be an integer between 1 and 100")

      const reqHigh = new Request("http://localhost/api/notifications?limit=101")
      const resHigh = await getNotifications(reqHigh)
      expect(resHigh.status).toBe(400)
    })

    it("should reject invalid non-numeric limit or offset with 400", async () => {
      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: {} as any,
      })

      const req = new Request("http://localhost/api/notifications?limit=abc&offset=-5")
      const res = await getNotifications(req)
      expect(res.status).toBe(400)
    })

    it("should accept valid limit and offset params, enforce user ownership filter, and construct query", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [{ id: "notif-1", title: "Test Notification", is_read: false }],
        error: null,
        count: 1,
      })

      const mockQueryChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: mockRange,
      }

      const mockSupabase = {
        from: vi.fn().mockReturnValue(mockQueryChain),
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: mockSupabase as any,
      })

      const req = new Request("http://localhost/api/notifications?limit=20&offset=10")
      const res = await getNotifications(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.notifications).toHaveLength(1)
      expect(data.count).toBe(1)
      expect(mockQueryChain.eq).toHaveBeenCalledWith("user_id", "user-1")
      expect(mockRange).toHaveBeenCalledWith(10, 29)
    })

    it("should return 500 when database returns an error", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database failure" },
        count: null,
      })

      const mockQueryChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: mockRange,
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: { from: vi.fn().mockReturnValue(mockQueryChain) } as any,
      })

      const req = new Request("http://localhost/api/notifications")
      const res = await getNotifications(req)
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe("Unable to load notifications")
    })
  })

  describe("PATCH /api/notifications", () => {
    it("should reject non-boolean isRead in request body with 400", async () => {
      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: {} as any,
      })

      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ isRead: "yes" }),
      })

      const res = await patchNotifications(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("isRead boolean is required")
    })

    it("should update notifications scoped to user_id", async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: "n1" }, { id: "n2" }],
        error: null,
      })

      const mockQueryChain: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: mockSelect,
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: { from: vi.fn().mockReturnValue(mockQueryChain) } as any,
      })

      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      })

      const res = await patchNotifications(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.updated).toBe(2)
      expect(mockQueryChain.update).toHaveBeenCalledWith({ is_read: true })
      expect(mockQueryChain.eq).toHaveBeenCalledWith("user_id", "user-1")
    })
  })

  describe("PATCH /api/notifications/[id]", () => {
    it("should reject non-boolean isRead with 400", async () => {
      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: {} as any,
      })

      const req = new Request("http://localhost/api/notifications/n1", {
        method: "PATCH",
        body: JSON.stringify({ isRead: null }),
      })

      const res = await patchSingleNotification(req, { params: Promise.resolve({ id: "n1" }) })
      expect(res.status).toBe(400)
    })

    it("should return 404 if notification is not found or does not belong to user", async () => {
      const mockQueryChain: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: { from: vi.fn().mockReturnValue(mockQueryChain) } as any,
      })

      const req = new Request("http://localhost/api/notifications/n1", {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      })

      const res = await patchSingleNotification(req, { params: Promise.resolve({ id: "n1" }) })
      expect(res.status).toBe(404)
      expect(mockQueryChain.eq).toHaveBeenCalledWith("id", "n1")
      expect(mockQueryChain.eq).toHaveBeenCalledWith("user_id", "user-1")
      const data = await res.json()
      expect(data.error).toBe("Notification not found")
    })
  })

  describe("DELETE /api/notifications/[id]", () => {
    it("should return 404 if notification to delete is not found or belongs to another user", async () => {
      const mockQueryChain: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: { from: vi.fn().mockReturnValue(mockQueryChain) } as any,
      })

      const req = new Request("http://localhost/api/notifications/n1", { method: "DELETE" })
      const res = await deleteSingleNotification(req, { params: Promise.resolve({ id: "n1" }) })
      expect(res.status).toBe(404)
      expect(mockQueryChain.eq).toHaveBeenCalledWith("id", "n1")
      expect(mockQueryChain.eq).toHaveBeenCalledWith("user_id", "user-1")
    })

    it("should return 200 on successful deletion", async () => {
      const mockQueryChain: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "n1" }, error: null }),
      }

      vi.mocked(requireUser).mockResolvedValue({
        ok: true,
        user: { id: "user-1" } as any,
        dbUser: null,
        supabase: { from: vi.fn().mockReturnValue(mockQueryChain) } as any,
      })

      const req = new Request("http://localhost/api/notifications/n1", { method: "DELETE" })
      const res = await deleteSingleNotification(req, { params: Promise.resolve({ id: "n1" }) })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.message).toBe("Notification deleted successfully")
    })
  })
})
