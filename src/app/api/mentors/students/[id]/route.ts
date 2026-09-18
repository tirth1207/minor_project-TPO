import { NextResponse } from "next/server"

import { requireActiveMentor } from "@/lib/auth/require-active-mentor"

export const dynamic = "force-dynamic"

type ProfileStatus = "PENDING" | "APPROVED" | "REJECTED"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id: studentProfileId } = await params

    const auth = await requireActiveMentor()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const {
      supabase,
      deptId,
      orgId,
    } = auth

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!student_profiles_user_id_fkey!inner(
          id,
          org_id,
          dept_id,
          department:departments!users_dept_id_fkey(
            id,
            name
          )
        )
      `)
      .eq("id", studentProfileId)
      .maybeSingle()

    if (studentError) {
      console.error(
        "Student lookup failed:",
        studentError
      )

      return NextResponse.json(
        { error: studentError.message },
        { status: 500 }
      )
    }

    if (!student) {
      return NextResponse.json(
        {
          error: "Student profile not found",
        },
        { status: 404 }
      )
    }

    const studentUser = Array.isArray(student.user)
      ? student.user[0]
      : student.user

    if (!studentUser) {
      return NextResponse.json(
        {
          error: "Student user account could not be resolved",
        },
        { status: 400 }
      )
    }

    if (
      studentUser.dept_id !== deptId ||
      studentUser.org_id !== orgId
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Student belongs to another department or college",
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      student,
    })
  } catch (error: unknown) {
    console.error(
      "GET mentor student failed:",
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

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id: studentProfileId } = await params

    const auth = await requireActiveMentor()

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const {
      supabase,
      deptId,
      orgId,
      user,
    } = auth

    /* -------------------------------------------------------
       Parse request body
    ------------------------------------------------------- */

    let body: {
      profile_status?: ProfileStatus
      rejection_reason?: string | null
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body",
        },
        { status: 400 }
      )
    }

    const profileStatus =
      body.profile_status

    if (
      !profileStatus ||
      ![
        "APPROVED",
        "REJECTED",
        "PENDING",
      ].includes(profileStatus)
    ) {
      return NextResponse.json(
        {
          error: "Invalid profile_status value",
        },
        { status: 400 }
      )
    }

    /* -------------------------------------------------------
       Validate rejection reason
    ------------------------------------------------------- */

    let rejectionReason: string | null = null

    if (profileStatus === "REJECTED") {
      rejectionReason =
        typeof body.rejection_reason === "string"
          ? body.rejection_reason.trim()
          : ""

      if (!rejectionReason) {
        return NextResponse.json(
          {
            error:
              "A rejection reason is required when rejecting a student profile.",
          },
          { status: 400 }
        )
      }

      if (rejectionReason.length < 5) {
        return NextResponse.json(
          {
            error:
              "Rejection reason must contain at least 5 characters.",
          },
          { status: 400 }
        )
      }

      if (rejectionReason.length > 1000) {
        return NextResponse.json(
          {
            error:
              "Rejection reason cannot exceed 1000 characters.",
          },
          { status: 400 }
        )
      }
    }

    /* -------------------------------------------------------
       Find student
    ------------------------------------------------------- */

    const {
      data: student,
      error: studentError,
    } = await supabase
      .from("student_profiles")
      .select(`
        id,
        user_id,
        mentor_id,
        profile_status,
        rejection_reason,
        student_user:users!student_profiles_user_id_fkey(
          id,
          role,
          org_id,
          dept_id
        )
      `)
      .eq("id", studentProfileId)
      .maybeSingle()

    if (studentError) {
      console.error(
        "Student lookup failed:",
        studentError
      )

      return NextResponse.json(
        {
          error: studentError.message,
        },
        { status: 400 }
      )
    }

    if (!student) {
      return NextResponse.json(
        {
          error: "Student not found",
        },
        { status: 404 }
      )
    }

    /* -------------------------------------------------------
       Resolve joined user
    ------------------------------------------------------- */

    const studentUser = Array.isArray(
      student.student_user
    )
      ? student.student_user[0]
      : student.student_user

    if (!studentUser) {
      return NextResponse.json(
        {
          error:
            "Student user account could not be resolved",
        },
        { status: 400 }
      )
    }

    /* -------------------------------------------------------
       Validate role
    ------------------------------------------------------- */

    if (studentUser.role !== "STUDENT") {
      return NextResponse.json(
        {
          error:
            "The selected profile does not belong to a student",
        },
        { status: 400 }
      )
    }

    /* -------------------------------------------------------
       Validate organization
    ------------------------------------------------------- */

    if (studentUser.org_id !== orgId) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Student belongs to another college",
        },
        { status: 403 }
      )
    }

    /* -------------------------------------------------------
       Validate department
    ------------------------------------------------------- */

    if (studentUser.dept_id !== deptId) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Student belongs to another department",
        },
        { status: 403 }
      )
    }

    /* -------------------------------------------------------
       Validate mentor assignment
    ------------------------------------------------------- */

    if (!student.mentor_id) {
      return NextResponse.json(
        {
          error:
            "This student does not have an assigned mentor",
        },
        { status: 400 }
      )
    }

    if (student.mentor_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Forbidden: This student is assigned to another mentor",
        },
        { status: 403 }
      )
    }

    /* -------------------------------------------------------
       Update profile status + rejection reason
    ------------------------------------------------------- */

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("student_profiles")
      .update({
        profile_status: profileStatus,
        rejection_reason:
          profileStatus === "REJECTED"
            ? rejectionReason
            : null,
      })
      .eq("id", studentProfileId)
      .eq("mentor_id", user.id)
      .select(`
        *,
        user:users!student_profiles_user_id_fkey(
          id,
          org_id,
          dept_id,
          department:departments!users_dept_id_fkey(
            id,
            name
          )
        )
      `)
      .single()

    if (updateError) {
      console.error(
        "Student approval update failed:",
        updateError
      )

      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 400 }
      )
    }

    /* -------------------------------------------------------
       Response
    ------------------------------------------------------- */

    const message =
      profileStatus === "APPROVED"
        ? "Student profile approved successfully."
        : profileStatus === "REJECTED"
          ? "Student profile rejected successfully."
          : "Student profile moved back to pending review."

    return NextResponse.json({
      student: updated,
      message,
    })
  } catch (error: unknown) {
    console.error(
      "PATCH mentor student failed:",
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