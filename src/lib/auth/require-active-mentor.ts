import { createClient } from "@/lib/supabase/server"

export async function requireActiveMentor() {
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

  if (role !== "MENTOR" || !orgId || !deptId) {
    return { ok: false, error: "Forbidden: Mentor access only", status: 403 as const }
  }

  // Fetch the organization and verify status is ACTIVE
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, status")
    .eq("id", orgId)
    .maybeSingle()

  if (orgError) {
    return { ok: false, error: "Database error retrieving organization", status: 500 as const }
  }

  if (!organization || organization.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your organization account is not active.",
      status: 403 as const,
    }
  }

  // Fetch the department and verify status is ACTIVE and org_id matches
  const { data: department, error: deptError } = await supabase
    .from("departments")
    .select("id, name, status, org_id")
    .eq("id", deptId)
    .maybeSingle()

  if (deptError) {
    return { ok: false, error: "Database error retrieving department", status: 500 as const }
  }

  if (!department || department.org_id !== orgId || department.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your department is not active or verified.",
      status: 403 as const,
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
    organization,
    department,
    orgId,
    deptId,
  }
}
