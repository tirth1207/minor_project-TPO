export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

const jsonError = (error: string, status = 400) => NextResponse.json({ error }, { status })

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) return null
  const values = value.map((item) => item.trim()).filter(Boolean)
  if (!values.length || values.some((item) => item.length > 100) || values.length > 50) return null
  return [...new Set(values)]
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous"
  const rateLimit = checkRateLimit(`auth-register:${ip}`, { windowMs: 60 * 1000, maxRequests: 5 })
  if (!rateLimit.success) return rateLimitResponse()

  const supabaseAdmin = createServiceClient()
  let authUserId: string | null = null
  let publicUserCreated = false
  let studentProfileCreated = false

  async function cleanup() {
    if (!authUserId) return
    try {
      if (studentProfileCreated) {
        const { error } = await supabaseAdmin.from("student_profiles").delete().eq("user_id", authUserId)
        if (error) console.error("Student profile cleanup failed:", error)
        else studentProfileCreated = false
      }
      if (publicUserCreated) {
        const { error } = await supabaseAdmin.from("users").delete().eq("id", authUserId)
        if (error) console.error("Public user cleanup failed:", error)
        else publicUserCreated = false
      }
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
      if (authDeleteError) console.error("Auth user cleanup failed:", authDeleteError)
      else authUserId = null
    } catch (error) {
      console.error("Student registration cleanup failed:", error)
    }
  }

  try {
    let body: Record<string, unknown>
    try {
      const parsed: unknown = await request.json()
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError("Invalid registration request.")
      body = parsed as Record<string, unknown>
    } catch {
      return jsonError("Request body must be valid JSON.")
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : ""
    const mentorId = typeof body.mentorId === "string" ? body.mentorId.trim() : ""
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : ""
    const enrollmentNo = typeof body.enrollmentNo === "string" ? body.enrollmentNo.trim() : ""
    const dob = typeof body.dob === "string" ? body.dob.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const semester = Number(body.semester)
    const skills = parseStringArray(body.skills)
    const hobbies = parseStringArray(body.hobbies)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid email address.")
    if (password.length < 6 || password.length > 128) return jsonError("Password must contain 6–128 characters.")
    if (!inviteToken || !mentorId) return jsonError("A valid invitation token and an approved mentor are required.")
    if (name.length < 2 || name.length > 120) return jsonError("Full name must contain 2–120 characters.")
    if (!enrollmentNo || enrollmentNo.length > 50 || !/^[A-Za-z0-9/-]+$/.test(enrollmentNo)) return jsonError("Enter a valid enrollment number using letters, numbers, hyphens, or slashes.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(Date.parse(dob)) || new Date(dob).toISOString().slice(0, 10) !== dob || dob > new Date().toISOString().slice(0, 10)) return jsonError("Enter a valid date of birth that is not in the future.")
    const phoneDigits = phone.replace(/\D/g, "")
    if (!/^[+]?[0-9 ()-]+$/.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 15) return jsonError("Enter a valid phone number containing 10–15 digits.")
    if (!Number.isInteger(semester) || semester < 1 || semester > 6) return jsonError("Select a semester from 1 to 6.")
    let cgpa = 0
    if (semester >= 3) {
      const rawCgpa = body.cgpa
      if (rawCgpa === null || rawCgpa === undefined || rawCgpa === "" || !Number.isFinite(Number(rawCgpa)) || Number(rawCgpa) < 0 || Number(rawCgpa) > 10) return jsonError("CGPA is required for semesters 3–6 and must be between 0 and 10.")
      cgpa = Number(Number(rawCgpa).toFixed(2))
    }
    if (!skills) return jsonError("Add at least one valid skill, separated by commas.")
    if (!hobbies) return jsonError("Add at least one valid hobby, separated by commas.")

    const { data: invite, error: inviteError } = await supabaseAdmin.from("invite_links").select("dept_id, expires_at, used_count").eq("token", inviteToken).maybeSingle()
    if (inviteError) {
      console.error("Invite lookup failed:", inviteError)
      return jsonError("Failed to validate invitation token.")
    }
    if (!invite) return jsonError("Invalid invitation token. Please request a valid token from your College Admin.")
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return jsonError("This invitation token has expired. Please contact your College Admin.")

    const { data: department, error: departmentError } = await supabaseAdmin.from("departments").select("id, org_id, name, status").eq("id", invite.dept_id).maybeSingle()
    if (departmentError) {
      console.error("Department lookup failed:", departmentError)
      return jsonError("Failed to resolve the department associated with this invitation.")
    }
    if (!department) return jsonError("Department associated with this invitation was not found.")
    if (department.status !== "ACTIVE") return jsonError("The department associated with this invitation is not active.", 403)

    const { data: organization, error: organizationError } = await supabaseAdmin.from("organizations").select("id, name, status").eq("id", department.org_id).maybeSingle()
    if (organizationError) {
      console.error("Organization lookup failed:", organizationError)
      return jsonError("Failed to resolve the organization associated with this invitation.")
    }
    if (!organization) return jsonError("Organization associated with this invitation was not found.")
    if (organization.status !== "ACTIVE") return jsonError("The organization associated with this invitation is not active.", 403)

    const { data: mentor, error: mentorError } = await supabaseAdmin
      .from("mentor_profiles")
      .select("id, user_id, name, employee_id, designation, profile_status, user:users!mentor_profiles_user_id_fkey!inner(id, role, org_id, dept_id)")
      .eq("user_id", mentorId).eq("profile_status", "APPROVED").eq("user.role", "MENTOR")
      .eq("user.org_id", organization.id).eq("user.dept_id", department.id).maybeSingle()
    if (mentorError) {
      console.error("Selected mentor validation failed:", mentorError)
      return jsonError("Failed to validate selected mentor.")
    }
    if (!mentor) return jsonError("Selected mentor is not an approved mentor for your college and department.")

    const { data: duplicateEnrollment, error: duplicateError } = await supabaseAdmin.from("student_profiles").select("user_id").ilike("enrollment_no", enrollmentNo).limit(1).maybeSingle()
    if (duplicateError) {
      console.error("Enrollment number lookup failed:", duplicateError)
      return jsonError("Could not validate enrollment number. Please try again.", 500)
    }
    if (duplicateEnrollment) return jsonError("This enrollment number is already registered. Check the number or contact your College Admin.", 409)

    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role: "STUDENT", org_id: organization.id, dept_id: department.id },
    })
    if (createUserError || !userData.user) {
      console.error("Auth user creation failed:", createUserError)
      return jsonError(createUserError?.message?.toLowerCase().includes("already") ? "An account with this email already exists." : "Failed to create user account.")
    }
    const authUser = userData.user
    authUserId = authUser.id

    const { error: publicUserError } = await supabaseAdmin.from("users").insert({ id: authUser.id, role: "STUDENT", org_id: organization.id, dept_id: department.id })
    if (publicUserError) {
      console.error("Public user creation failed:", publicUserError)
      await cleanup()
      return jsonError("Failed to create user profile.")
    }
    publicUserCreated = true

    const { data: studentProfile, error: studentProfileError } = await supabaseAdmin.from("student_profiles").insert({
      user_id: authUser.id,
      enrollment_no: enrollmentNo,
      name,
      dob,
      phone,
      semester,
      branch: department.name,
      cgpa,
      skills,
      hobbies,
      active_backlogs: 0,
      resume_url: "https://placeholder.resume.pdf",
      profile_status: "PENDING",
      is_placed: false,
      mentor_id: mentor.user_id,
    }).select("id, user_id, enrollment_no, name, branch, profile_status, mentor_id").single()

    if (studentProfileError || !studentProfile) {
      console.error("Student profile creation failed:", studentProfileError)
      await cleanup()
      if (studentProfileError?.code === "23505" || studentProfileError?.message?.toLowerCase().includes("duplicate")) return jsonError("This enrollment number is already registered. Check the number or contact your College Admin.", 409)
      return jsonError("Failed to create student profile.")
    }
    studentProfileCreated = true

    const { error: inviteUpdateError } = await supabaseAdmin.from("invite_links").update({ used_count: (invite.used_count ?? 0) + 1 }).eq("token", inviteToken)
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
    return jsonError("An unexpected error occurred during registration.", 500)
  }
}
