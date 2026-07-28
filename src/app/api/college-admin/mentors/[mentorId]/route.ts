export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

type MentorProfileStatus =
  | "APPROVED"
  | "REJECTED"

interface RouteContext {
  params: Promise<{
    mentorId: string
  }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // -----------------------------------------------------
    // Authenticate college admin + active organization
    // -----------------------------------------------------

    const auth = await requireActiveCollegeAdmin()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, orgId } = auth

    // -----------------------------------------------------
    // Params
    // -----------------------------------------------------

    const { mentorId } = await context.params

    if (!mentorId) {
      return NextResponse.json(
        {
          error: "Mentor ID is required",
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Body
    // -----------------------------------------------------

    const body = await request.json()

    const status = String(
      body.status ?? ""
    ).toUpperCase() as MentorProfileStatus

    if (
      status !== "APPROVED" &&
      status !== "REJECTED"
    ) {
      return NextResponse.json(
        {
          error:
            "Status must be APPROVED or REJECTED",
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Find mentor + verify organization ownership
    // -----------------------------------------------------

    const {
      data: mentor,
      error: mentorError,
    } = await supabase
      .from("mentor_profiles")
      .select(`
        id,
        user_id,
        name,
        employee_id,
        profile_status,

        user:users!mentor_profiles_user_id_fkey!inner(
          id,
          role,
          org_id,
          dept_id
        )
      `)
      .eq("id", mentorId)
      .eq("user.org_id", orgId)
      .eq("user.role", "MENTOR")
      .maybeSingle()

    if (mentorError) {
      console.error(
        "Failed to find mentor:",
        mentorError
      )

      return NextResponse.json(
        {
          error: mentorError.message,
        },
        { status: 400 }
      )
    }

    if (!mentor) {
      return NextResponse.json(
        {
          error:
            "Mentor not found or does not belong to your organization",
        },
        { status: 404 }
      )
    }

    // -----------------------------------------------------
    // Avoid unnecessary update
    // -----------------------------------------------------

    if (mentor.profile_status === status) {
      return NextResponse.json(
        {
          mentor,
          message:
            status === "APPROVED"
              ? "Mentor is already approved."
              : "Mentor is already rejected.",
        },
        { status: 200 }
      )
    }

    // -----------------------------------------------------
    // Update status
    // -----------------------------------------------------

    const {
      data: updatedMentor,
      error: updateError,
    } = await supabase
      .from("mentor_profiles")
      .update({
        profile_status: status,
      })
      .eq("id", mentorId)
      .select(`
        id,
        user_id,
        name,
        employee_id,
        designation,
        qualification,
        specialization,
        phone,
        bio,
        skills,
        social_links,
        profile_status,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error(
        "Failed to update mentor status:",
        updateError
      )

      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------

    return NextResponse.json(
      {
        mentor: updatedMentor,

        message:
          status === "APPROVED"
            ? `${mentor.name} has been approved successfully.`
            : `${mentor.name} has been rejected.`,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error(
      "PATCH /api/college-admin/mentors/[mentorId] failed:",
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