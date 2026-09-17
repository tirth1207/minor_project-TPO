export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth

    const { data: profile, error } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (error) {
      console.error("GET /api/students/career-profile db error:", error)
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Unable to load career profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { profile: profile || null },
    })
  } catch (err: unknown) {
    console.error("GET /api/students/career-profile error:", err)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth
    const body = await request.json().catch(() => ({}))

    const dreamJob = (body.dream_job || body.dreamJob || "").trim()
    const dreamRole = (body.dream_role || body.dreamRole || "").trim()
    const currentSkills = Array.isArray(body.current_skills)
      ? body.current_skills
      : Array.isArray(body.currentSkills)
      ? body.currentSkills
      : []
    const dreamSkills = Array.isArray(body.dream_skills)
      ? body.dream_skills
      : Array.isArray(body.dreamSkills)
      ? body.dreamSkills
      : []

    if (!dreamJob || !dreamRole) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "Dream job domain and target role are required" },
        { status: 400 }
      )
    }

    if (currentSkills.length === 0 || dreamSkills.length === 0) {
      return NextResponse.json(
        { success: false, code: "VALIDATION_ERROR", error: "At least one current skill and one dream skill are required" },
        { status: 400 }
      )
    }

    const profileData = {
      student_id: studentId,
      dream_job: dreamJob,
      dream_role: dreamRole,
      dream_ctc: body.dream_ctc ? Number(body.dream_ctc) : body.dreamCtc ? Number(body.dreamCtc) : null,
      dream_skills: dreamSkills,
      current_skills: currentSkills,
      skill_level: body.skill_level || body.skillLevel || "Intermediate",
      target_job_type: body.target_job_type || body.targetJobType || "Full-time",
      preferred_work_mode: body.preferred_work_mode || body.preferredWorkMode || "Hybrid",
      target_timeline: body.target_timeline || body.targetTimeline || "3 months",
      target_companies: Array.isArray(body.target_companies)
        ? body.target_companies
        : Array.isArray(body.targetCompanies)
        ? body.targetCompanies
        : [],
      current_challenges: (body.current_challenges || body.currentChallenges || "").trim(),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("student_career_profiles")
      .upsert(profileData, { onConflict: "student_id" })
      .select()
      .single()

    if (error) {
      console.error("PUT /api/students/career-profile upsert error:", error)
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Unable to save career profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { profile: data },
      message: "Career profile updated successfully",
    })
  } catch (err: unknown) {
    console.error("PUT /api/students/career-profile error:", err)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}
