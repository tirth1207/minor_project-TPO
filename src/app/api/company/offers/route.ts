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

type CompanyOfferRow = {
  id: string
  ctc_offered: number
  status: string
  extended_at: string
  decided_at: string | null
  application: {
    id: string
    status: string
    applied_at: string
    mock_score: number | null
    job_college_mapping: {
      id: string
      job: { id: string; title: string; company_id: string }
    }
    student: {
      id: string
      name: string
      enrollment_no: string
      branch: string
      cgpa: number
      active_backlogs: number
      resume_url: string
    } | null
  } | null
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
    const { data: offers, error, count } = await supabase
      .from("offers")
      .select(`
        id, ctc_offered, status, extended_at, decided_at,
        application:applications!inner(
          id, status, applied_at, mock_score,
          job_college_mapping:job_college_mappings!inner(
            id, job:job_postings!inner(id, title, company_id)
          ),
          student:student_profiles(
            id, name, enrollment_no, branch, cgpa, active_backlogs, resume_url
          )
        )
      `, { count: "exact" })
      .eq("application.job_college_mapping.job.company_id", companyId)
      .order("extended_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[COMPANY OFFERS API]", error)
      return NextResponse.json({ error: "Unable to load offers" }, { status: 500 })
    }

    const applicants = ((offers ?? []) as unknown as CompanyOfferRow[])
      .filter((offer) => offer.application)
      .map((offer) => {
        const application = offer.application!
        return {
          id: application.id,
          status: application.status,
          applied_at: application.applied_at,
          mock_score: application.mock_score,
          job_college_mapping: application.job_college_mapping,
          student: application.student,
          offer: {
            id: offer.id,
            ctc_offered: offer.ctc_offered,
            status: offer.status,
            extended_at: offer.extended_at,
            decided_at: offer.decided_at,
          },
        }
      })

    const total = count ?? 0
    return NextResponse.json({
      applicants,
      offers: applicants,
      count: total,
      hasMore: offset + applicants.length < total,
    })
  } catch (error: unknown) {
    console.error("[COMPANY OFFERS API]", error)
    return NextResponse.json({ error: "Unable to load offers" }, { status: 500 })
  }
}
