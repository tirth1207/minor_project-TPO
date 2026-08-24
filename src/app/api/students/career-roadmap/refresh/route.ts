export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateGroundedCareerRoadmap } from "@/lib/ai/career-roadmap"

export async function POST() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId, orgId } = auth

    const { data: profile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json(
        { error: "Complete career onboarding before refreshing your roadmap." },
        { status: 400 }
      )
    }

    const { data: mappings } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        local_status,
        job:job_postings!inner(
          id,
          title,
          ctc_max,
          location,
          work_mode,
          require_mock,
          mock_pass_score,
          min_cgpa,
          max_backlogs,
          global_status,
          description,
          company:company_profiles(company_name),
          job_eligible_branches(branch_name)
        )
      `)
      .eq("org_id", orgId)
      .eq("local_status", "APPROVED")

    const approvedJobs = (mappings || []).filter(
      (m: any) => m.job && m.job.global_status === "APPROVED"
    )

    const { data: mocks } = await supabase
      .from("mock_interviews")
      .select("id, mock_type, overall_score, skill_scores, passed, completed_at")
      .eq("student_id", studentId)
      .eq("status", "EVALUATED")

    const roadmapData = await generateGroundedCareerRoadmap(
      profile,
      approvedJobs,
      mocks || []
    )

    await supabase.from("student_career_roadmaps").upsert(
      {
        student_id: studentId,
        roadmap_data: roadmapData,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    )

    return NextResponse.json({
      roadmap: roadmapData,
      generatedAt: new Date().toISOString(),
      message: "AI Roadmap refreshed successfully!",
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to refresh career roadmap" },
      { status: 500 }
    )
  }
}
