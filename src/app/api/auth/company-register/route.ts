export const dynamic = "force-dynamic"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password, companyName, website } = await request.json()

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: "Email, password, and company name are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServiceClient()

    // 1. Create user in auth
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for easy previewing
    })

    if (createError || !userData.user) {
      return NextResponse.json(
        { error: createError?.message || "Failed to create user account." },
        { status: 400 }
      )
    }

    const authUser = userData.user

    // 2. Insert into public.users (role = COMPANY, org_id = null, dept_id = null)
    const { error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.id,
        role: "COMPANY",
        org_id: null,
        dept_id: null,
      })

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { error: "Failed to map user profile. " + userInsertError.message },
        { status: 400 }
      )
    }

    // 3. Insert into public.company_profiles (status = PENDING)
    const { error: profileInsertError } = await supabaseAdmin
      .from("company_profiles")
      .insert({
        user_id: authUser.id,
        company_name: companyName,
        website: website || null,
        status: "PENDING", // Stays pending until super admin approves
      })

    if (profileInsertError) {
      await supabaseAdmin.from("users").delete().eq("id", authUser.id)
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
      return NextResponse.json(
        { error: "Failed to create company profile. " + profileInsertError.message },
        { status: 400 }
      )
    }

    // 4. Auto login
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred during company registration" },
      { status: 500 }
    )
  }
}
