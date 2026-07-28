export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireUser()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, user, dbUser } = auth

    const role =
      dbUser?.role ||
      user.app_metadata?.role

    if (role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Student access only" },
        { status: 403 }
      )
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("student_profiles")
        .select(`
          *,
          user:users!student_profiles_user_id_fkey(
            id,
            org_id,
            dept_id,

            department:departments!users_dept_id_fkey(
              id,
              name
            ),

            organization:organizations!users_org_id_fkey(
              id,
              name
            )
          ),

          mentor:users!student_profiles_mentor_id_fkey(
            id,
            mentor_profile:mentor_profiles!mentor_profiles_user_id_fkey(
              id,
              name,
              employee_id,
              designation,
              qualification,
              specialization,
              phone,
              profile_status
            )
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle()

    if (profileError) {
      console.error(
        "Student profile fetch error:",
        profileError
      )

      return NextResponse.json(
        {
          error: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        },
        { status: 400 }
      )
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile,
    })
  } catch (error: unknown) {
    console.error(
      "GET /api/students/profile failed:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      enrollment_no,
      dob,
      address,
      phone,
      bio,
      cgpa,
      active_backlogs,
      semester,
      branch,
      skills,
      hobbies,
      resume_url,
      marksheet_url,
      social_links,
    } = body

    // Simple validations
    if (!name || !branch || !semester) {
      return NextResponse.json({ error: "Name, branch, and semester are required" }, { status: 400 })
    }

    // Overwrite fields in student_profiles
    const { data: updated, error: updateError } =
    await supabase
      .from("student_profiles")
      .update({
        name: name.trim(),
        enrollment_no: enrollment_no.trim(),

        dob,
        address: address.trim(),
        phone: phone.trim(),
        bio: bio.trim(),

        cgpa: Number(cgpa),
        active_backlogs: Number(active_backlogs),
        semester: Number(semester),
        branch: branch.trim(),

        skills,
        hobbies,

        resume_url: resume_url.trim(),
        marksheet_url: marksheet_url.trim(),

        social_links,
      })
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ profile: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
