export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import {
  generateGroundedCareerRoadmap,
  generateProfileHash,
  generateJobsHash,
} from "@/lib/ai/career-roadmap"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`career-roadmap-refresh:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId, orgId } = auth

    const { data: profile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_REQUIRED",
          error: "Complete career onboarding before refreshing your roadmap.",
        },
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

    const currentProfileHash = generateProfileHash(profile)
    const currentJobsHash = generateJobsHash(approvedJobs)

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

    const nowIso = new Date().toISOString()
    await supabase.from("student_career_roadmaps").upsert(
      {
        student_id: studentId,
        roadmap_data: roadmapData,
        profile_hash: currentProfileHash,
        jobs_hash: currentJobsHash,
        generated_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "student_id" }
    )

    return NextResponse.json({
      success: true,
      data: {
        roadmap: roadmapData,
        generatedAt: nowIso,
      },
      message: "AI Roadmap refreshed successfully!",
    })
  } catch (err: any) {
    console.error("[Career Refresh] Error:", err)
    return NextResponse.json(
      {
        success: false,
        code: "REFRESH_FAILED",
        error: err?.message || "Failed to refresh career roadmap",
      },
      { status: 500 }
    )
  }
}
