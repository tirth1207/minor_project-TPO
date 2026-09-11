import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function middleware(request: NextRequest) {
  if (request.method === "POST" && request.nextUrl.pathname.startsWith("/api/auth/")) {
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor?.split(",")[0]?.trim() || "anonymous"
    const rateLimit = checkRateLimit(`auth-api:${ip}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    })

    if (!rateLimit.success) return rateLimitResponse()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
