export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const rateLimit = checkRateLimit(`auth-register:${ip}`, { windowMs: 60 * 1000, maxRequests: 5 })
  if (!rateLimit.success) return rateLimitResponse()

  const supabaseAdmin = createServiceClient()

  let authUserId: string | null = null
  let publicUserCreated = false
  let studentProfileCreated = false

  async function cleanup() {
    try {
      if (studentProfileCreated && authUserId) {
        await supabaseAdmin.from("student_profiles").delete().eq("user_id", authUserId)
        studentProfileCreated = false
      }
      if (publicUserCreated && authUserId) {
        await supabaseAdmin.from("users").delete().eq("id", authUserId)
        publicUserCreated = false
      }
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        authUserId = null
      }
    } catch (error) {
      console.error("Student registration cleanup failed:", error)
    }
  }

  try {
    const body = await request.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const inviteToken = String(body.inviteToken ?? "").trim()
    const mentorId = String(body.mentorId ?? "").trim()

    if (!email || !password || !inviteToken || !mentorId) {
      return NextResponse.json({ error: "Email, password, invite token, and mentor are required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must contain at least 6 characters" }, { status: 400 })
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_links")
      .select("dept_id, expires_at, used_count")
      .eq("token", inviteToken)
      .maybeSingle()
    if (inviteError) {
      console.error("Invite lookup failed:", inviteError)
      return NextResponse.json({ error: "Failed to validate invitation token" }, { status: 400 })
    }
    if (!invite) return NextResponse.json({ error: "Invalid invitation token. Please request a valid token from your College Admin." }, { status: 400 })
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This invitation token has expired. Please contact your College Admin." }, { status: 400 })
    }

    const { data: department, error: departmentError } = await supabaseAdmin
      .from("departments")
      .select("id, org_id, name, status")
      .eq("id", invite.dept_id)
      .maybeSingle()
    if (departmentError) {
      console.error("Department lookup failed:", departmentError)
      return NextResponse.json({ error: "Failed to resolve the department associated with this invitation." }, { status: 400 })
    }
    if (!department) return NextResponse.json({ error: "Department associated with this invitation was not found." }, { status: 400 })
    if (department.status !== "ACTIVE") return NextResponse.json({ error: "The department associated with this invitation is not active." }, { status: 403 })

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, status")
      .eq("id", department.org_id)
      .maybeSingle()
    if (organizationError) {
      console.error("Organization lookup failed:", organizationError)
      return NextResponse.json({ error: "Failed to resolve the organization associated with this invitation." }, { status: 400 })
    }
    if (!organization) return NextResponse.json({ error: "Organization associated with this invitation was not found." }, { status: 400 })
    if (organization.status !== "ACTIVE") return NextResponse.json({ error: "The organization associated with this invitation is not active." }, { status: 403 })

    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from("mentor_profiles")
      .select(`id, user_id, name, employee_id, designation, profile_status, user:users!mentor_profiles_user_id_fkey!inner(id, role, org_id, dept_id)`)
      .eq("user_id", mentorId)
      .eq("profile_status", "APPROVED")
      .eq("user.role", "MENTOR")
      .eq("user.org_id", organization.id)
      .eq("user.dept_id", department.id)
      .maybeSingle()
    if (mentorError) {
      console.error("Selected mentor validation failed:", mentorError)
      return NextResponse.json({ error: "Failed to validate selected mentor" }, { status: 400 })
    }
    if (!mentor) return NextResponse.json({ error: "Selected mentor is not an approved mentor for your college and department." }, { status: 400 })

    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "STUDENT", org_id: organization.id, dept_id: department.id },
    })
    if (createUserError || !userData.user) {
      console.error("Auth user creation failed:", createUserError)
      return NextResponse.json({ error: "Failed to create user account" }, { status: 400 })
    }

    const authUser = userData.user
    authUserId = authUser.id

    const { error: publicUserError } = await supabaseAdmin.from("users").insert({ id: authUser.id, role: "STUDENT", org_id: organization.id, dept_id: department.id })
    if (publicUserError) {
      console.error("Public user creation failed:", publicUserError)
      await cleanup()
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 400 })
    }
    publicUserCreated = true

    const username = email.split("@")[0] || "Student"
    const studentName = username.charAt(0).toUpperCase() + username.slice(1)
    const enrollmentNo = `ENR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`

    const { data: studentProfile, error: studentProfileError } = await supabaseAdmin
      .from("student_profiles")
      .insert({ user_id: authUser.id, enrollment_no: enrollmentNo, name: studentName, cgpa: 8.0, active_backlogs: 0, semester: 6, branch: department.name, resume_url: "https://placeholder.resume.pdf", profile_status: "PENDING", is_placed: false, mentor_id: mentor.user_id })
      .select("id, user_id, enrollment_no, name, branch, profile_status, mentor_id")
      .single()
    if (studentProfileError || !studentProfile) {
      console.error("Student profile creation failed:", studentProfileError)
      await cleanup()
      return NextResponse.json({ error: "Failed to create student profile" }, { status: 400 })
    }
    studentProfileCreated = true

    const { error: inviteUpdateError } = await supabaseAdmin
      .from("invite_links")
      .update({ used_count: (invite.used_count ?? 0) + 1 })
      .eq("token", inviteToken)
    if (inviteUpdateError) console.error("Failed to increment invite usage:", inviteUpdateError)

    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    return NextResponse.json({
      user: authUser,
      student: studentProfile,
      organization: { id: organization.id, name: organization.name },
      department: { id: department.id, name: department.name },
      mentor: { id: mentor.user_id, profileId: mentor.id, name: mentor.name, employeeId: mentor.employee_id, designation: mentor.designation },
      session: signInError ? null : signInData.session,
      message: signInError ? "Student account created successfully, but automatic login failed. Please sign in manually." : "Student account created successfully.",
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("Student registration failed:", error)
    await cleanup()
    return NextResponse.json({ error: "An unexpected error occurred during registration" }, { status: 500 })
  }
}
