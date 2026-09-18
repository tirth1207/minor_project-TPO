export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import {
  generateGroundedCareerRoadmap,
  generateProfileHash,
  generateJobsHash,
  generateMocksHash,
} from "@/lib/ai/career-roadmap"
import { checkStudentEligibility } from "@/lib/eligibility/check-student-eligibility"
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

    const { data: profile, error: profileError } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (profileError) {
      console.error("[Career Refresh] Profile fetch failed:", profileError)
      return NextResponse.json(
        { success: false, code: "PROFILE_FETCH_FAILED", error: "Unable to load career profile" },
        { status: 500 }
      )
    }

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

    const { data: mappings, error: jobsError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        local_status,
        job:job_postings!inner(
          id,
          title,
          description,
          skills,
          ctc_min,
          ctc_max,
          location,
          work_mode,
          require_mock,
          mock_pass_score,
          min_cgpa,
          max_backlogs,
          global_status,
          company:company_profiles(company_name),
          job_eligible_branches(branch_name)
        )
      `)
      .eq("org_id", orgId)
      .eq("local_status", "APPROVED")

    if (jobsError) {
      console.error("[Career Refresh] Jobs fetch failed:", jobsError)
      return NextResponse.json(
        { success: false, code: "JOBS_FETCH_FAILED", error: "Unable to load placement opportunities" },
        { status: 500 }
      )
    }

    const approvedJobs = (mappings || []).filter(
      (m: any) => m.job && m.job.global_status === "APPROVED"
    )

    const eligibleJobs: any[] = []
    for (const mapping of approvedJobs) {
      const job = mapping.job as any
      try {
        if (await checkStudentEligibility(supabase, studentId, job.id, orgId)) {
          eligibleJobs.push(mapping)
        }
      } catch (eligibilityError) {
        console.error("[Career Refresh] Eligibility check failed:", eligibilityError)
        return NextResponse.json(
          { success: false, code: "ELIGIBILITY_CHECK_FAILED", error: "Unable to verify placement eligibility" },
          { status: 503 }
        )
      }
    }

    const { data: mocks, error: mocksError } = await supabase
      .from("mock_interviews")
      .select("id, mock_type, overall_score, skill_scores, passed, completed_at, updated_at")
      .eq("student_id", studentId)
      .eq("status", "EVALUATED")

    if (mocksError) {
      console.error("[Career Refresh] Mock history fetch failed:", mocksError)
      return NextResponse.json(
        { success: false, code: "MOCK_HISTORY_FETCH_FAILED", error: "Unable to load mock interview history" },
        { status: 500 }
      )
    }

    const currentProfileHash = generateProfileHash(profile)
    const currentJobsHash = generateJobsHash(eligibleJobs)
    const currentMocksHash = generateMocksHash(mocks || [])

    const roadmapData = await generateGroundedCareerRoadmap(
      profile,
      eligibleJobs,
      mocks || []
    )

    const nowIso = new Date().toISOString()
    const { error: cacheError } = await supabase.from("student_career_roadmaps").upsert(
      {
        student_id: studentId,
        roadmap_data: roadmapData,
        profile_hash: currentProfileHash,
        jobs_hash: currentJobsHash,
        mocks_hash: currentMocksHash,
        generated_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "student_id" }
    )

    if (cacheError) {
      console.error("[Career Refresh] Cache persistence failed:", cacheError)
      return NextResponse.json(
        { success: false, code: "CACHE_PERSIST_FAILED", error: "Roadmap generated but could not be saved" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        roadmap: roadmapData,
        generatedAt: nowIso,
      },
      message: "AI Roadmap refreshed successfully!",
    })
  } catch (err: unknown) {
    console.error("[Career Refresh] Error:", err)
    return NextResponse.json(
      {
        success: false,
        code: "REFRESH_FAILED",
        error: "Failed to refresh career roadmap",
      },
      { status: 500 }
    )
  }
}
