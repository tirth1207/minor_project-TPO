export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateGroundedCareerRoadmap } from "@/lib/ai/career-roadmap"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId, orgId } = auth

    // Fetch career profile
    const { data: profile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.json({
        roadmap: null,
        onboardingRequired: true,
        message: "Student career onboarding not completed",
      })
    }

    // Check cached roadmap
    const { data: cached } = await supabase
      .from("student_career_roadmaps")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (cached?.roadmap_data && cached?.generated_at) {
      const generatedAt = new Date(cached.generated_at).getTime()
      const now = new Date().getTime()
      // Cache valid for 12 hours
      if (now - generatedAt < 12 * 60 * 60 * 1000) {
        return NextResponse.json({
          roadmap: cached.roadmap_data,
          generatedAt: cached.generated_at,
          cached: true,
        })
      }
    }

    // Fetch student's eligible/approved jobs
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

    // Fetch student's mock interview history
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
      cached: false,
    })
  } catch (err: any) {
    console.error("Career roadmap error:", err)
    return NextResponse.json(
      { error: err?.message || "Failed to load career roadmap" },
      { status: 500 }
    )
  }
}
