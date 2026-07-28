export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabaseAdmin = createServiceClient()

  let authUserId: string | null = null
  let createdOrgId: string | null = null
  let createdDepartmentId: string | null = null

  async function cleanup() {
    try {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        authUserId = null
      }

      if (createdDepartmentId) {
        await supabaseAdmin
          .from("departments")
          .delete()
          .eq("id", createdDepartmentId)

        createdDepartmentId = null
      }

      if (createdOrgId) {
        await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", createdOrgId)

        createdOrgId = null
      }
    } catch (error) {
      console.error("Registration cleanup failed:", error)
    }
  }

  try {
    const body = await request.json()

    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")

    const instituteName = String(
      body.instituteName ?? ""
    ).trim()

    const departmentName = String(
      body.departmentName ?? ""
    ).trim()

    const name = String(body.name ?? "").trim()
    const employeeId = String(body.employeeId ?? "").trim()
    const designation = String(body.designation ?? "").trim()
    const qualification = String(body.qualification ?? "").trim()
    const specialization = String(body.specialization ?? "").trim()
    const phone = String(body.phone ?? "").trim()

    // -----------------------------------------------------
    // Validation
    // -----------------------------------------------------

    if (
      !email ||
      !password ||
      !instituteName ||
      !departmentName ||
      !name ||
      !employeeId
    ) {
      return NextResponse.json(
        {
          error:
            "Name, employee ID, institute, department, email and password are required",
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Password must contain at least 6 characters",
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Check employee ID
    // -----------------------------------------------------

    const {
      data: existingMentor,
      error: mentorLookupError,
    } = await supabaseAdmin
      .from("mentor_profiles")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle()

    if (mentorLookupError) {
      return NextResponse.json(
        { error: mentorLookupError.message },
        { status: 400 }
      )
    }

    if (existingMentor) {
      return NextResponse.json(
        {
          error: "A mentor with this employee ID already exists",
        },
        { status: 409 }
      )
    }

    // -----------------------------------------------------
    // Find organization
    // -----------------------------------------------------

    const {
      data: existingOrg,
      error: orgLookupError,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, name, status")
      .ilike("name", instituteName)
      .maybeSingle()

    if (orgLookupError) {
      return NextResponse.json(
        { error: orgLookupError.message },
        { status: 400 }
      )
    }

    let organization = existingOrg

    // -----------------------------------------------------
    // Create organization
    // -----------------------------------------------------

    if (!organization) {
      const {
        data: newOrg,
        error: orgCreateError,
      } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: instituteName,
          status: "PENDING",
        })
        .select("id, name, status")
        .single()

      if (orgCreateError || !newOrg) {
        return NextResponse.json(
          {
            error:
              orgCreateError?.message ??
              "Failed to create institute",
          },
          { status: 400 }
        )
      }

      organization = newOrg
      createdOrgId = newOrg.id
    }

    // -----------------------------------------------------
    // Find department
    // -----------------------------------------------------

    const {
      data: existingDepartment,
      error: departmentLookupError,
    } = await supabaseAdmin
      .from("departments")
      .select("id, org_id, name, status")
      .eq("org_id", organization.id)
      .ilike("name", departmentName)
      .maybeSingle()

    if (departmentLookupError) {
      await cleanup()

      return NextResponse.json(
        { error: departmentLookupError.message },
        { status: 400 }
      )
    }

    let department = existingDepartment

    // -----------------------------------------------------
    // Create department
    // -----------------------------------------------------

    if (!department) {
      const {
        data: newDepartment,
        error: departmentCreateError,
      } = await supabaseAdmin
        .from("departments")
        .insert({
          org_id: organization.id,
          name: departmentName,
          status: "PENDING",
        })
        .select("id, org_id, name, status")
        .single()

      if (departmentCreateError || !newDepartment) {
        await cleanup()

        return NextResponse.json(
          {
            error:
              departmentCreateError?.message ??
              "Failed to create department",
          },
          { status: 400 }
        )
      }

      department = newDepartment
      createdDepartmentId = newDepartment.id
    }

    // -----------------------------------------------------
    // Create auth user
    // -----------------------------------------------------

    const {
      data: userData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,

      app_metadata: {
        role: "MENTOR",
        org_id: organization.id,
        dept_id: department.id,
      },

      user_metadata: {
        name,
      },
    })

    if (createUserError || !userData.user) {
      await cleanup()

      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "Failed to create mentor account",
        },
        { status: 400 }
      )
    }

    authUserId = userData.user.id

    // -----------------------------------------------------
    // Create public.users
    // -----------------------------------------------------

    const { error: publicUserError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUserId,
        role: "MENTOR",
        org_id: organization.id,
        dept_id: department.id,
      })

    if (publicUserError) {
      await cleanup()

      return NextResponse.json(
        {
          error:
            "Failed to create mentor user: " +
            publicUserError.message,
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Create mentor profile
    // -----------------------------------------------------

    const {
      data: mentorProfile,
      error: mentorProfileError,
    } = await supabaseAdmin
      .from("mentor_profiles")
      .insert({
        user_id: authUserId,
        name,
        employee_id: employeeId,
        designation: designation || null,
        qualification: qualification || null,
        specialization: specialization || null,
        phone: phone || null,
        profile_status: "PENDING",
      })
      .select(`
        id,
        user_id,
        name,
        employee_id,
        designation,
        qualification,
        specialization,
        phone,
        profile_status,
        created_at
      `)
      .single()

    if (mentorProfileError || !mentorProfile) {
      await cleanup()

      return NextResponse.json(
        {
          error:
            "Failed to create mentor profile: " +
            (mentorProfileError?.message ??
              "Unknown database error"),
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------
    // Sign in
    // -----------------------------------------------------

    const supabase = await createClient()

    const {
      data: signInData,
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error(
        "Mentor created but automatic login failed:",
        signInError
      )
    }

    return NextResponse.json(
      {
        user: userData.user,
        mentor: mentorProfile,
        organization,
        department,
        session: signInData?.session ?? null,
        message:
          "Mentor account created successfully and is awaiting approval.",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Mentor registration error:", error)

    await cleanup()

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during mentor registration",
      },
      { status: 500 }
    )
  }
}