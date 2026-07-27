import { createClient } from "@/lib/supabase/server"

export async function requireApprovedStudent() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, error: "Unauthorized", status: 401 as const }
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("role, org_id, dept_id")
    .eq("id", user.id)
    .maybeSingle()

  if (dbUserError) {
    return { ok: false, error: "Database error retrieving user metadata", status: 500 as const }
  }

  const role = dbUser?.role || user.app_metadata?.role
  const orgId = dbUser?.org_id || user.app_metadata?.org_id
  const deptId = dbUser?.dept_id || user.app_metadata?.dept_id

  if (role !== "STUDENT" || !orgId || !deptId) {
    return { ok: false, error: "Forbidden: Student access only", status: 403 as const }
  }

  // Fetch student profile
  const { data: studentProfile, error: spError } = await supabase
    .from("student_profiles")
    .select("id, profile_status, name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (spError) {
    return { ok: false, error: "Database error retrieving student profile", status: 500 as const }
  }

  if (!studentProfile) {
    return { ok: false, error: "Forbidden: Student profile not found", status: 404 as const }
  }

  if (studentProfile.profile_status !== "APPROVED") {
    return {
      ok: false,
      error: "Forbidden: Your student profile must be approved by a mentor.",
      status: 403 as const,
    }
  }

  // Fetch organization and verify status is ACTIVE
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", orgId)
    .maybeSingle()

  if (orgError || !organization || organization.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your college organization is not active.",
      status: 403 as const,
    }
  }

  // Fetch department and verify status is ACTIVE
  const { data: department, error: deptError } = await supabase
    .from("departments")
    .select("id, status")
    .eq("id", deptId)
    .maybeSingle()

  if (deptError || !department || department.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your department is not active.",
      status: 403 as const,
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
    studentProfile,
    studentId: studentProfile.id,
    orgId,
    deptId,
  }
}
