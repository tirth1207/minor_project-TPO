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

    // Fetch the specific application and verify it belongs to this company
    const { data: application, error } = await supabase
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
        job_college_mapping:job_college_mappings!inner(
          id,
          job:job_postings!inner(
            id,
            title,
            description,
            location,
            work_mode,
            ctc_min,
            ctc_max,
            require_mock,
            mock_pass_score,
            global_status,
            company_profiles(
              id,
              company_name,
              website
            )
          ),
          local_status
        ),
        rounds:application_rounds(
          id,
          round_name,
          status,
          company_feedback
        ),
        offers:offers(
          id,
          ctc_offered,
          status,
          extended_at,
          decided_at
        )
      `)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("[COMPANY APPLICATION GET]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Verify the application belongs to a job from this company
    if (!application ||
        !application.job_college_mapping ||
        !application.job_college_mapping.job ||
        application.job_college_mapping.job.company_profiles.id !== companyId) {
      return NextResponse.json(
        { error: "Application not found or unauthorized access" },
        { status: 404 }
      )
    }

    return NextResponse.json({ application })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION GET]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}