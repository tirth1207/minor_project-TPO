export const dynamic = "force-dynamic"

import { requireActiveCollegeAdmin } from "@/lib/auth/require-active-college-admin"
import { NextResponse } from "next/server"

type MentorUser = {
  org_id: string | null
  dept_id: string | null
  department: { id: string; name: string } | null
  organization: { id: string; name: string } | null
}

export async function GET() {
  try {
    const auth = await requireActiveCollegeAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { supabase, orgId } = auth
    const { data, error } = await supabase
      .from("mentor_profiles")
      .select(`
        id, user_id, name, employee_id, designation, qualification,
        specialization, phone, bio, skills, social_links,
        profile_status, created_at, updated_at,
        user:users!mentor_profiles_user_id_fkey!inner(
          id, role, org_id, dept_id,
          department:departments(id, name),
          organization:organizations(id, name)
        )
      `)
      .eq("user.org_id", orgId)
      .eq("user.role", "MENTOR")
      .order("name", { ascending: true })

    if (error) {
      console.error("GET /api/college-admin/mentors failed:", error)
      return NextResponse.json({ error: "Unable to load mentors" }, { status: 500 })
    }

    const mentors = (data ?? []).map((mentor) => {
      const user = (Array.isArray(mentor.user) ? mentor.user[0] : mentor.user) as MentorUser | undefined

      return {
        id: mentor.id,
        user_id: mentor.user_id,
        name: mentor.name,
        employee_id: mentor.employee_id,
        designation: mentor.designation,
        qualification: mentor.qualification,
        specialization: mentor.specialization,
        phone: mentor.phone,
        bio: mentor.bio,
        skills: mentor.skills,
        social_links: mentor.social_links ?? {},
        profile_status: mentor.profile_status,
        created_at: mentor.created_at,
        updated_at: mentor.updated_at,
        role: "MENTOR" as const,
        org_id: user?.org_id ?? null,
        dept_id: user?.dept_id ?? null,
        department: user?.department ?? null,
        organization: user?.organization ?? null,
      }
    })

    return NextResponse.json({ mentors })
  } catch (error: unknown) {
    console.error("GET /api/college-admin/mentors failed:", error)
    return NextResponse.json({ error: "Unable to load mentors" }, { status: 500 })
  }
}
