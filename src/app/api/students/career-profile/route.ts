export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth

    const { data: profile, error } = await supabase
      .from("student_career_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth
    const body = await request.json()

    const profileData = {
      student_id: studentId,
      dream_job: body.dream_job || body.dreamJob || "Software Engineer",
      dream_role: body.dream_role || body.dreamRole || "Full Stack Developer",
      dream_ctc: body.dream_ctc ? Number(body.dream_ctc) : (body.dreamCtc ? Number(body.dreamCtc) : null),
      dream_skills: Array.isArray(body.dream_skills) ? body.dream_skills : (Array.isArray(body.dreamSkills) ? body.dreamSkills : []),
      current_skills: Array.isArray(body.current_skills) ? body.current_skills : (Array.isArray(body.currentSkills) ? body.currentSkills : []),
      skill_level: body.skill_level || body.skillLevel || "Intermediate",
      target_job_type: body.target_job_type || body.targetJobType || "Full-time",
      preferred_work_mode: body.preferred_work_mode || body.preferredWorkMode || "Hybrid",
      target_timeline: body.target_timeline || body.targetTimeline || "3 months",
      target_companies: Array.isArray(body.target_companies) ? body.target_companies : (Array.isArray(body.targetCompanies) ? body.targetCompanies : []),
      current_challenges: body.current_challenges || body.currentChallenges || "",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("student_career_profiles")
      .upsert(profileData, { onConflict: "student_id" })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ profile: data, message: "Career profile updated successfully" })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
