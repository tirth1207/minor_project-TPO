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

    it("should accept valid limit and offset params and construct database query", async () => {
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
      expect(mockRange).toHaveBeenCalledWith(10, 29) // offset 10 to offset + limit - 1
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

    it("should return 404 if notification is not found for user", async () => {
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
      const data = await res.json()
      expect(data.error).toBe("Notification not found")
    })
  })

  describe("DELETE /api/notifications/[id]", () => {
    it("should return 404 if notification to delete is not found", async () => {
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
    })
  })
})
