export const dynamic = "force-dynamic"

import { requireActiveMentor } from "@/lib/auth/require-active-mentor"
import { NextResponse } from "next/server"

type ProfileStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { supabase, deptId, orgId } = auth

    const { data: student, error: studentError } = await supabase
      .from("student_profiles")
      .select(`
        *,
        user:users!student_profiles_user_id_fkey!inner(
          id, org_id, dept_id,
          department:departments!users_dept_id_fkey(id, name)
        )
      `)
      .eq("id", studentProfileId)
      .maybeSingle()

    if (studentError) {
      console.error("Student lookup failed:", studentError)
      return NextResponse.json({ error: studentError.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    if (student.user.dept_id !== deptId || student.user.org_id !== orgId) {
      return NextResponse.json({ error: "Forbidden: Student belongs to another department or college" }, { status: 403 })
    }

    return NextResponse.json({ student })
  } catch (error: unknown) {
    console.error("GET mentor student failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    /* -----------------------------------------------------
       Parse body
    ----------------------------------------------------- */

    const body = await request.json()

    const profileStatus =
      body.profile_status as ProfileStatus

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

    /* -----------------------------------------------------
       Find student

       IMPORTANT:
       id = student_profiles.id

       Explicit FK is required because student_profiles has:
       - user_id   -> users.id
       - mentor_id -> users.id
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Validate role
    ----------------------------------------------------- */

    if (studentUser.role !== "STUDENT") {
      return NextResponse.json(
        {
          error:
            "The selected profile does not belong to a student",
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Validate organization boundary
    ----------------------------------------------------- */

    if (studentUser.org_id !== orgId) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Student belongs to another college",
        },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       Validate department boundary
    ----------------------------------------------------- */

    if (studentUser.dept_id !== deptId) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Student belongs to another department",
        },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       Validate mentor assignment

       Student selected a mentor during registration,
       so only that mentor should approve/reject them.
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Update approval status
    ----------------------------------------------------- */

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("student_profiles")
      .update({
        profile_status: profileStatus,
      })
      .eq("id", studentProfileId)
      .eq("mentor_id", user.id)
      .select(`
        *
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

    return NextResponse.json({
      student: updated,

      message:
        profileStatus === "APPROVED"
          ? "Student profile approved successfully."
          : profileStatus === "REJECTED"
            ? "Student profile rejected successfully."
            : "Student profile moved back to pending review.",
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
