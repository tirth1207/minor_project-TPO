export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

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

    const { supabase, companyId } = auth

    // Validate company owns this job posting
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("id")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job posting not found or unauthorized access" }, { status: 404 })
    }

    // Fetch all applicants for this job posting
    const { data: applicants, error: applicantsError } = await supabase
      .from("applications")
      .select(`
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
        )
      `)
      .eq("job_college_mapping.job_id", id)
      .order("applied_at", { ascending: false })

    if (applicantsError) {
      return NextResponse.json({ error: applicantsError.message }, { status: 400 })
    }

    return NextResponse.json({ applicants })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
