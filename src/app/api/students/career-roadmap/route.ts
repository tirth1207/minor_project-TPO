export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import {
  generateGroundedCareerRoadmap,
  generateProfileHash,
  generateJobsHash,
} from "@/lib/ai/career-roadmap"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`career-roadmap:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
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
        success: true,
        data: {
          roadmap: null,
          onboardingRequired: true,
          message: "Student career onboarding not completed",
        },
      })
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

    // Compute hashes for deterministic cache validation
    const currentProfileHash = generateProfileHash(profile)
    const currentJobsHash = generateJobsHash(approvedJobs)

    // Check cached roadmap
    const { data: cached } = await supabase
      .from("student_career_roadmaps")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (cached?.roadmap_data && cached?.generated_at) {
      const generatedAt = new Date(cached.generated_at).getTime()
      const now = Date.now()
      const isWithinWindow = now - generatedAt < 12 * 60 * 60 * 1000
      const isHashMatch =
        cached.profile_hash === currentProfileHash &&
        cached.jobs_hash === currentJobsHash

      if (isWithinWindow && isHashMatch) {
        return NextResponse.json({
          success: true,
          data: {
            roadmap: cached.roadmap_data,
            generatedAt: cached.generated_at,
            cached: true,
          },
        })
      }
    }

    // Fetch student's mock interview history for roadmap context
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
    console.log("[Career Roadmap] Generated roadmap:", roadmapData)
    return NextResponse.json({
      success: true,
      data: {
        roadmap: roadmapData,
        generatedAt: nowIso,
        cached: false,
      },
    })
  } catch (err: any) {
    console.error("[Career Roadmap] Endpoint error:", err)
    return NextResponse.json(
      {
        success: false,
        code: "GENERATION_FAILED",
        error: err?.message || "Failed to load career roadmap",
      },
      { status: 500 }
    )
  }
}
