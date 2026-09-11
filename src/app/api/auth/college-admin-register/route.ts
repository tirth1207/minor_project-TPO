export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const rateLimit = checkRateLimit(`auth-admin-register:${ip}`, { windowMs: 60 * 1000, maxRequests: 5 })
  if (!rateLimit.success) return rateLimitResponse()

  const supabaseAdmin = createServiceClient()
  let authUserId: string | null = null
  let organizationId: string | null = null

  try {
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const instituteName = String(body.instituteName || "").trim()

    if (!email || !password || !instituteName) return NextResponse.json({ error: "Institute name, email and password are required" }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: "Password must contain at least 6 characters" }, { status: 400 })

    const { data: existingOrg, error: existingOrgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .ilike("name", instituteName)
      .maybeSingle()

    if (existingOrgError) {
      console.error("Organization lookup failed:", existingOrgError)
      return NextResponse.json({ error: "Unable to validate institute" }, { status: 500 })
    }
    if (existingOrg) return NextResponse.json({ error: "An institute with this name already exists. Contact the administrator if you need access to it." }, { status: 409 })

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({ name: instituteName, status: "PENDING" })
      .select("id, name, status")
      .single()

    if (organizationError || !organization) {
      console.error("Organization creation failed:", organizationError)
      return NextResponse.json({ error: "Failed to create institute" }, { status: 400 })
    }
    organizationId = organization.id

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "COLLEGE_ADMIN" },
    })

    if (createError || !userData.user) {
      console.error("College admin auth creation failed:", createError)
      await supabaseAdmin.from("organizations").delete().eq("id", organization.id)
      organizationId = null
      return NextResponse.json({ error: "Failed to create account" }, { status: 400 })
    }
    authUserId = userData.user.id

    const { error: userInsertError } = await supabaseAdmin.from("users").insert({
      id: authUserId,
      role: "COLLEGE_ADMIN",
      org_id: organization.id,
      dept_id: null,
    })

    if (userInsertError) {
      console.error("College admin profile creation failed:", userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      await supabaseAdmin.from("organizations").delete().eq("id", organization.id)
      return NextResponse.json({ error: "Failed to create account profile" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    return NextResponse.json({
      user: userData.user,
      organization,
      session: signInError ? null : signInData.session,
      message: "Institute registered successfully and is awaiting approval.",
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("College admin registration failed:", error)
    if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId)
    if (organizationId) await supabaseAdmin.from("organizations").delete().eq("id", organizationId)
    return NextResponse.json({ error: "An unexpected error occurred during registration" }, { status: 500 })
  }
}
