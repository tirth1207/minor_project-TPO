export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function parsePagination(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawPage = Number(searchParams.get("page") ?? "1")
  const rawLimit = Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT))

  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT

  return { page, limit, offset: (page - 1) * limit }
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase } = auth
    const { page, limit, offset } = parsePagination(request)
    const { data: jobs, error, count } = await supabase
      .from("job_postings")
      .select(`
        *,
        company:company_profiles(company_name, website),
        job_eligible_branches(branch_name)
      `, { count: "exact" })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("GET /api/super-admin/jobs failed:", error)
      return NextResponse.json({ error: "Unable to load job postings" }, { status: 500 })
    }

    const total = count ?? 0
    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total,
        has_more: offset + limit < total,
      },
    })
  } catch (error: unknown) {
    console.error("GET /api/super-admin/jobs failed:", error)
    return NextResponse.json({ error: "Unable to load job postings" }, { status: 500 })
  }
}
