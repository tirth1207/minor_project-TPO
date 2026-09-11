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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const url = new URL(request.url)
    const limit = parseBoundedInt(url.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT)
    const offset = parseBoundedInt(url.searchParams.get("offset"), 0, MAX_OFFSET)

    if (limit === null || offset === null) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 })
    }

    const { supabase, companyId } = auth

    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("id")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job posting not found or unauthorized access" }, { status: 404 })
    }

    const { data: applicants, error: applicantsError, count } = await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        applied_at,
        mock_score,
        student:student_profiles(
          id,
          name,
          enrollment_no,
          branch,
          cgpa,
          active_backlogs,
          resume_url
        ),
        offer:offers(
          id,
          ctc_offered,
          status
        ),
        job_college_mapping:job_college_mappings!inner(
          job_id
        ),
        rounds:application_rounds(
          id,
          round_name,
          status,
          company_feedback
        )
      `,
        { count: "exact" }
      )
      .eq("job_college_mapping.job_id", id)
      .order("applied_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (applicantsError) {
      console.error("[COMPANY JOB APPLICANTS]", applicantsError)
      return NextResponse.json({ error: "Unable to load applicants" }, { status: 500 })
    }

    const total = count ?? 0
    return NextResponse.json({
      applicants: applicants ?? [],
      count: total,
      hasMore: offset + (applicants?.length ?? 0) < total,
    })
  } catch (error: unknown) {
    console.error("[COMPANY JOB APPLICANTS]", error)
    return NextResponse.json({ error: "Unable to load applicants" }, { status: 500 })
  }
}
