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
        { success: false, error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`career-roadmap:${auth.user.id}`, { windowMs: 60 * 1000, maxRequests: 15 })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId, orgId } = auth

    // Fetch student career profile
    const { data: profile } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.json({
        success: true,
        roadmap: null,
        onboardingRequired: true,
        message: "Student career onboarding required",
      })
    }

    // Fetch active approved campus drive mappings for this college
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

    const profileHash = generateProfileHash(profile)
    const jobsHash = generateJobsHash(approvedJobs)

    // Check cached roadmap with hash invalidation
    const { data: cached } = await supabase
      .from("student_career_roadmaps")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (cached?.roadmap_data && cached?.generated_at) {
      const generatedAt = new Date(cached.generated_at).getTime()
      const now = Date.now()
      const isExpired = now - generatedAt > 12 * 60 * 60 * 1000
      const isHashMatch = cached.profile_hash === profileHash && cached.jobs_hash === jobsHash

      if (!isExpired && isHashMatch) {
        return NextResponse.json({
          success: true,
          roadmap: cached.roadmap_data,
          generatedAt: cached.generated_at,
          cached: true,
        })
      }
    }

    // Fetch student's evaluated mock interview performance history
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
        profile_hash: profileHash,
        jobs_hash: jobsHash,
        generated_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "student_id" }
    )

    return NextResponse.json({
      success: true,
      roadmap: roadmapData,
      generatedAt: nowIso,
      cached: false,
    })
  } catch (err: any) {
    console.error("[CAREER_ROADMAP_ERROR]", err)
    return NextResponse.json(
      {
        success: false,
        error: "AI career analysis is temporarily unavailable. Your profile is safe. Try again.",
        code: "ROADMAP_GEN_FAILED",
      },
      { status: 500 }
    )
  }
}
