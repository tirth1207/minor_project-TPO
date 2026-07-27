export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth

    const { data: companies, error } = await supabase
      .from("company_profiles")
      .select("*")
      .order("company_name", { ascending: true })

    if (error) throw error

    return NextResponse.json({ companies: companies || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred retrieving companies" },
      { status: 500 }
    )
  }
}
