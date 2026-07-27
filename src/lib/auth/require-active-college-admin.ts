import { createClient } from "@/lib/supabase/server"

export async function requireActiveCollegeAdmin() {
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
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle()

  if (dbUserError) {
    return { ok: false, error: "Database error retrieving user metadata", status: 500 as const }
  }

  const role = dbUser?.role || user.app_metadata?.role
  const orgId = dbUser?.org_id || user.app_metadata?.org_id

  if (role !== "COLLEGE_ADMIN" || !orgId) {
    return { ok: false, error: "Forbidden: College Admin access only", status: 403 as const }
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

  if (!organization) {
    return { ok: false, error: "Forbidden: Associated organization not found", status: 403 as const }
  }

  if (organization.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your organization account is not active.",
      status: 403 as const,
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
    organization,
    orgId,
  }
}
