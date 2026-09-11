export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const rateLimit = checkRateLimit(`auth-company-register:${ip}`, { windowMs: 60 * 1000, maxRequests: 5 })
  if (!rateLimit.success) return rateLimitResponse()

  const supabaseAdmin = createServiceClient()
  let authUserId: string | null = null
  let publicUserCreated = false

  try {
    const body = await request.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const companyName = String(body.companyName ?? "").trim()
    const website = String(body.website ?? "").trim()

    if (!email || !password || !companyName) return NextResponse.json({ error: "Email, password, and company name are required" }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: "Password must contain at least 6 characters" }, { status: 400 })

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !userData.user) {
      console.error("Company auth creation failed:", createError)
      return NextResponse.json({ error: "Failed to create company account" }, { status: 400 })
    }
    authUserId = userData.user.id

    const { error: userInsertError } = await supabaseAdmin.from("users").insert({ id: authUserId, role: "COMPANY", org_id: null, dept_id: null })
    if (userInsertError) {
      console.error("Company user profile creation failed:", userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      authUserId = null
      return NextResponse.json({ error: "Failed to create company profile" }, { status: 400 })
    }
    publicUserCreated = true

    const { error: profileInsertError } = await supabaseAdmin.from("company_profiles").insert({
      user_id: authUserId,
      company_name: companyName,
      website: website || null,
      status: "PENDING",
    })
    if (profileInsertError) {
      console.error("Company profile creation failed:", profileInsertError)
      if (publicUserCreated) await supabaseAdmin.from("users").delete().eq("id", authUserId)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: "Failed to create company profile" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    return NextResponse.json({
      user: userData.user,
      session: signInError ? null : signInData.session,
      message: signInError ? "Account created successfully, but automatic login failed. Please sign in manually." : "Company account created successfully and is awaiting approval.",
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("Company registration failed:", error)
    if (authUserId) {
      if (publicUserCreated) await supabaseAdmin.from("users").delete().eq("id", authUserId)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    }
    return NextResponse.json({ error: "An unexpected error occurred during company registration" }, { status: 500 })
  }
}
