export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Retrieve company profile
    const { data: companyProfile, error: cpError } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (cpError || !companyProfile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    // Validate company owns this job posting
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("id")
      .eq("id", id)
      .eq("company_id", companyProfile.id)
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
