export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

function parseNonNegativeInteger(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export async function GET(request: Request) {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, orgId } = auth
    const { searchParams } = new URL(request.url)
    const limit = parseNonNegativeInteger(searchParams.get("limit"), DEFAULT_LIMIT)
    const offset = parseNonNegativeInteger(searchParams.get("offset"), 0)

    if (limit === null || limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
        { status: 400 }
      )
    }

    if (offset === null || offset > MAX_OFFSET) {
      return NextResponse.json(
        { error: `offset must be an integer between 0 and ${MAX_OFFSET}` },
        { status: 400 }
      )
    }

    const { data: students, error: fetchError, count } = await supabase
      .from("student_profiles")
      .select(`
        id,
        user_id,
        enrollment_no,
        name,
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
        profile_status,
        is_placed,
        mentor_id,

        user:users!student_profiles_user_id_fkey!inner(
          id,
          org_id,
          dept_id,
          role,

          department:departments(
            id,
            name
          )
        )
      `, { count: "exact" })
      .eq("user.org_id", orgId)
      .eq("user.role", "STUDENT")
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error("College admin student query failed:", fetchError)
      return NextResponse.json({ error: "Unable to load students" }, { status: 500 })
    }

    const total = count ?? 0

    return NextResponse.json({
      students: students ?? [],
      count: total,
      hasMore: total > offset + limit,
    })
  } catch (error: unknown) {
    console.error("GET /api/college-admin/students failed:", error)
    return NextResponse.json(
      { error: "Unable to load students" },
      { status: 500 }
    )
  }
}
