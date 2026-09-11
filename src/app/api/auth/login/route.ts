export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous"
  const rateLimit = checkRateLimit(`auth-login:${ip}`, { windowMs: 60 * 1000, maxRequests: 10 })
  if (!rateLimit.success) return rateLimitResponse()

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const { user, session } = data
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("role, org_id, dept_id")
      .eq("id", user.id)
      .maybeSingle()

    if (dbUserError) {
      console.error("Login profile lookup failed:", dbUserError)
      return NextResponse.json({ error: "Unable to load account profile" }, { status: 500 })
    }

    const role = dbUser?.role || user.app_metadata?.role || "STUDENT"
    const org_id = dbUser?.org_id || user.app_metadata?.org_id || null
    const dept_id = dbUser?.dept_id || user.app_metadata?.dept_id || null

    return NextResponse.json({ user, session, role, org_id, dept_id })
  } catch (error: unknown) {
    console.error("POST /api/auth/login failed:", error)
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 })
  }
}
