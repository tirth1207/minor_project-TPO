export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

function parseBoundedInt(value: string | null, fallback: number, max: number) {
  if (value === null || value === "") return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) return null
  return parsed
}

export async function GET(request: Request) {
  try {
    const auth = await requireActiveCompany()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const url = new URL(request.url)
    const limit = parseBoundedInt(url.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)
    const offset = parseBoundedInt(url.searchParams.get("offset"), 0, MAX_OFFSET)

    if (limit === null || offset === null) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 })
    }

    const { supabase, companyId } = auth
    const from = offset
    const to = offset + limit - 1

    const { data: applications, error, count } = await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        applied_at,
        mock_score,
        job_college_mapping: job_college_mappings!inner(
          id,
          job: job_postings!inner(id, title, company_id)
        ),
        student: student_profiles(
          id, name, enrollment_no, branch, cgpa, active_backlogs, resume_url
        )
      `,
        { count: "exact" }
      )
      .eq("job_college_mapping.job.company_id", companyId)
      .order("applied_at", { ascending: false })
      .range(from, to)

    if (error) {
      console.error("[COMPANY APPLICATIONS]", error)
      return NextResponse.json({ error: "Unable to load applications" }, { status: 500 })
    }

    const total = count ?? 0
    return NextResponse.json({
      applicants: applications ?? [],
      count: total,
      hasMore: offset + (applications?.length ?? 0) < total,
    })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATIONS]", error)
    return NextResponse.json({ error: "Unable to load applications" }, { status: 500 })
  }
}
