export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")?.trim()

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    /* -----------------------------------------------------
       1. Find invite
    ----------------------------------------------------- */

    const { data: invite, error: inviteError } = await supabase
      .from("invite_links")
      .select(`
        id,
        dept_id,
        token,
        used_count,
        created_by,
        expires_at
      `)
      .eq("token", token)
      .maybeSingle()

    if (inviteError) {
      console.error("Invite lookup failed:", inviteError)

      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      )
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      )
    }

    /* -----------------------------------------------------
       2. Check expiration
    ----------------------------------------------------- */

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       3. Get department

       invite_links does NOT contain org_id.
       Organization comes from departments.org_id.
    ----------------------------------------------------- */

    const { data: department, error: departmentError } =
      await supabase
        .from("departments")
        .select(`
          id,
          org_id,
          name,
          status
        `)
        .eq("id", invite.dept_id)
        .maybeSingle()

    if (departmentError) {
      console.error(
        "Department lookup failed:",
        departmentError
      )

      return NextResponse.json(
        { error: departmentError.message },
        { status: 400 }
      )
    }

    if (!department) {
      return NextResponse.json(
        { error: "Department associated with this invitation was not found" },
        { status: 404 }
      )
    }

    if (department.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Department is not active" },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       4. Get organization
    ----------------------------------------------------- */

    const { data: organization, error: organizationError } =
      await supabase
        .from("organizations")
        .select(`
          id,
          name,
          status
        `)
        .eq("id", department.org_id)
        .maybeSingle()

    if (organizationError) {
      console.error(
        "Organization lookup failed:",
        organizationError
      )

      return NextResponse.json(
        { error: organizationError.message },
        { status: 400 }
      )
    }

    if (!organization) {
      return NextResponse.json(
        { error: "College associated with this invitation was not found" },
        { status: 404 }
      )
    }

    if (organization.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "College is not active" },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       5. Get approved mentors

       Requirements:
       - role = MENTOR
       - mentor profile APPROVED
       - same organization
       - same department
    ----------------------------------------------------- */

    const { data: mentors, error: mentorsError } =
      await supabase
        .from("mentor_profiles")
        .select(`
          id,
          user_id,
          name,
          employee_id,
          designation,
          qualification,
          specialization,
          phone,

          user:users!mentor_profiles_user_id_fkey!inner(
            id,
            role,
            org_id,
            dept_id
          )
        `)
        .eq("profile_status", "APPROVED")
        .eq("user.role", "MENTOR")
        .eq("user.org_id", organization.id)
        .eq("user.dept_id", department.id)
        .order("name", { ascending: true })

    if (mentorsError) {
      console.error(
        "Mentor lookup failed:",
        mentorsError
      )

      return NextResponse.json(
        { error: mentorsError.message },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       6. Return registration context
    ----------------------------------------------------- */

    return NextResponse.json({
      invite: {
        id: invite.id,
        expiresAt: invite.expires_at,
      },

      organization: {
        id: organization.id,
        name: organization.name,
      },

      department: {
        id: department.id,
        name: department.name,
      },

      mentors:
        mentors?.map((mentor) => ({
          // IMPORTANT:
          // student_profiles.mentor_id -> users.id
          id: mentor.user_id,

          profileId: mentor.id,
          name: mentor.name,
          employeeId: mentor.employee_id,
          designation: mentor.designation,
          qualification: mentor.qualification,
          specialization: mentor.specialization,
          phone: mentor.phone,
        })) ?? [],
    })
  } catch (error: unknown) {
    console.error(
      "GET student mentors failed:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load mentors",
      },
      { status: 500 }
    )
  }
}