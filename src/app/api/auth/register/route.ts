import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const { email, password, inviteToken } = await request.json()

    if (!email || !password || !inviteToken) {
      return NextResponse.json(
        { error: "Email, password, and invite token are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServiceClient()

    // 1. Look up invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_links")
      .select("dept_id, expires_at, used_count")
      .eq("token", inviteToken)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid invitation token. Please request a valid token from your College Admin." },
        { status: 400 }
      )
    }

    // 2. Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation token has expired. Please contact your College Admin." },
        { status: 400 }
      )
    }

    // 3. Get org_id from department
    const { data: department, error: deptError } = await supabaseAdmin
      .from("departments")
      .select("org_id")
      .eq("id", invite.dept_id)
      .maybeSingle()

    if (deptError || !department) {
      return NextResponse.json(
        { error: "Department or organization associated with this invite could not be resolved." },
        { status: 400 }
      )
    }

    // 4. Create user in auth via admin client (to bypass standard confirmation gates)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Mark email as confirmed for easy local/preview testing
    })

    if (createError || !userData.user) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create user account." },
        { status: 400 }
      )
    }

    const authUser = userData.user

    // 5. Insert user row
    const { error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.id,
        role: "STUDENT",
        org_id: department.org_id,
        dept_id: invite.dept_id,
      })

    if (userInsertError) {
      // Cleanup created auth user if db insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { error: "Failed to map user profile. " + userInsertError.message },
        { status: 400 }
      )
    }

    // 6. Insert student profile row
    const studentName = email.split("@")[0]
    const { error: profileInsertError } = await supabaseAdmin
      .from("student_profiles")
      .insert({
        user_id: authUser.id,
        enrollment_no: `ENR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: studentName.charAt(0).toUpperCase() + studentName.slice(1),
        cgpa: 8.00, // Seed a default CGPA (8.00) so they are eligible for most jobs initially
        active_backlogs: 0,
        semester: 6,
        branch: "Computer Science",
        resume_url: "https://placeholder.resume.pdf",
        profile_status: "PENDING",
        is_placed: false,
      })

    if (profileInsertError) {
      // Cleanup
      await supabaseAdmin.from("users").delete().eq("id", authUser.id)
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { error: "Failed to create student profile. " + profileInsertError.message },
        { status: 400 }
      )
    }

    // 7. Increment invite token usage
    await supabaseAdmin
      .from("invite_links")
      .update({ used_count: invite.used_count + 1 })
      .eq("token", inviteToken)

    // 8. Automatically sign user in to generate session cookies
    const supabase = await createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({
        user: authUser,
        session: null,
        message: "Account created successfully, but auto-login failed. Please sign in manually.",
      })
    }

    return NextResponse.json({
      user: authUser,
      session: signInData.session,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during registration"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
