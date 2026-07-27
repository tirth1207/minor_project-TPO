export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabaseAdmin = createServiceClient()

  let authUserId: string | null = null
  let organizationId: string | null = null

  try {
    const body = await request.json()

    const email = String(body.email || "")
      .trim()
      .toLowerCase()

    const password = String(body.password || "")

    const instituteName = String(
      body.instituteName || ""
    ).trim()

    if (!email || !password || !instituteName) {
      return NextResponse.json(
        {
          error:
            "Institute name, email and password are required",
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
       Check institute with same name
    ----------------------------------------------------- */

    const {
      data: existingOrg,
      error: existingOrgError,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, name, status")
      .ilike("name", instituteName)
      .maybeSingle()

    if (existingOrgError) {
      return NextResponse.json(
        { error: existingOrgError.message },
        { status: 400 }
      )
    }

    /*
     * Important:
     * Don't silently attach someone claiming to be an admin
     * to an existing institute.
     */
    if (existingOrg) {
      return NextResponse.json(
        {
          error:
            "An institute with this name already exists. Contact the administrator if you need access to it.",
        },
        { status: 409 }
      )
    }

    /* -----------------------------------------------------
       Create organization
    ----------------------------------------------------- */

    const {
      data: organization,
      error: organizationError,
    } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: instituteName,
        status: "PENDING",
      })
      .select("id, name, status")
      .single()

    if (organizationError || !organization) {
      return NextResponse.json(
        {
          error:
            organizationError?.message ||
            "Failed to create institute",
        },
        { status: 400 }
      )
    }

    organizationId = organization.id

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
        role: "COLLEGE_ADMIN",
      },
    })

    if (createError || !userData.user) {
      await supabaseAdmin
        .from("organizations")
        .delete()
        .eq("id", organization.id)

      return NextResponse.json(
        {
          error:
            createError?.message ||
            "Failed to create account",
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
          role: "COLLEGE_ADMIN",
          org_id: organization.id,
          dept_id: null,
        })

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )

      await supabaseAdmin
        .from("organizations")
        .delete()
        .eq("id", organization.id)

      return NextResponse.json(
        {
          error:
            "Failed to create college admin profile: " +
            userInsertError.message,
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Auto login
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

        session:
          signInError
            ? null
            : signInData.session,

        message:
          "Institute registered successfully and is awaiting approval.",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    /*
     * Basic cleanup for partially completed registration.
     */

    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId
      )
    }

    if (organizationId) {
      await supabaseAdmin
        .from("organizations")
        .delete()
        .eq("id", organizationId)
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error during registration",
      },
      { status: 500 }
    )
  }
}