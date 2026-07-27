export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabaseAdmin = createServiceClient()

  let authUserId: string | null = null
  let createdOrgId: string | null = null
  let createdDepartmentId: string | null = null

  try {
    const body = await request.json()

    const email = String(body.email || "")
      .trim()
      .toLowerCase()

    const password = String(body.password || "")

    const instituteName = String(
      body.instituteName || ""
    ).trim()

    const departmentName = String(
      body.departmentName || ""
    ).trim()

    if (
      !email ||
      !password ||
      !instituteName ||
      !departmentName
    ) {
      return NextResponse.json(
        {
          error:
            "Institute, department, email and password are required",
        },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 6 characters",
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Find organization
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Create organization if missing
    ----------------------------------------------------- */

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
              orgCreateError?.message ||
              "Failed to create institute",
          },
          { status: 400 }
        )
      }

      organization = newOrg
      createdOrgId = newOrg.id
    }

    /* -----------------------------------------------------
       Find department inside organization
    ----------------------------------------------------- */

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
      return NextResponse.json(
        { error: departmentLookupError.message },
        { status: 400 }
      )
    }

    let department = existingDepartment

    /* -----------------------------------------------------
       Create department
    ----------------------------------------------------- */

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
        .select(
          "id, org_id, name, status"
        )
        .single()

      if (
        departmentCreateError ||
        !newDepartment
      ) {
        if (createdOrgId) {
          await supabaseAdmin
            .from("organizations")
            .delete()
            .eq("id", createdOrgId)
        }

        return NextResponse.json(
          {
            error:
              departmentCreateError?.message ||
              "Failed to create department",
          },
          { status: 400 }
        )
      }

      department = newDepartment
      createdDepartmentId = newDepartment.id
    }

    /* -----------------------------------------------------
       Create auth account
    ----------------------------------------------------- */

    const {
      data: userData,
      error: createError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,

      app_metadata: {
        role: "MENTOR",
      },
    })

    if (createError || !userData.user) {
      if (createdDepartmentId) {
        await supabaseAdmin
          .from("departments")
          .delete()
          .eq("id", createdDepartmentId)
      }

      if (createdOrgId) {
        await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", createdOrgId)
      }

      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Failed to create mentor account",
        },
        { status: 400 }
      )
    }

    authUserId = userData.user.id

    /* -----------------------------------------------------
       Map public user
    ----------------------------------------------------- */

    const { error: userInsertError } =
      await supabaseAdmin
        .from("users")
        .insert({
          id: authUserId,
          role: "MENTOR",
          org_id: organization.id,
          dept_id: department.id,
        })

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )

      if (createdDepartmentId) {
        await supabaseAdmin
          .from("departments")
          .delete()
          .eq("id", createdDepartmentId)
      }

      if (createdOrgId) {
        await supabaseAdmin
          .from("organizations")
          .delete()
          .eq("id", createdOrgId)
      }

      return NextResponse.json(
        {
          error:
            "Failed to create mentor profile: " +
            userInsertError.message,
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Login
    ----------------------------------------------------- */

    const supabase = await createClient()

    const {
      data: signInData,
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return NextResponse.json(
      {
        user: userData.user,
        organization,
        department,

        session:
          signInError
            ? null
            : signInData.session,

        message:
          "Mentor account created successfully.",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )
    }

    if (createdDepartmentId) {
      await supabaseAdmin
        .from("departments")
        .delete()
        .eq("id", createdDepartmentId)
    }

    if (createdOrgId) {
      await supabaseAdmin
        .from("organizations")
        .delete()
        .eq("id", createdOrgId)
    }

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