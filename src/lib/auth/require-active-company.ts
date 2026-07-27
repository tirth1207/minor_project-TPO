import { createClient } from "@/lib/supabase/server"

export async function requireActiveCompany() {
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (dbUserError) {
    return { ok: false, error: "Database error retrieving user metadata", status: 500 as const }
  }

  const role = dbUser?.role || user.app_metadata?.role

  if (role !== "COMPANY") {
    return { ok: false, error: "Forbidden: Company access only", status: 403 as const }
  }

  // Fetch the company profile and check status
  const { data: companyProfile, error: cpError } = await supabase
    .from("company_profiles")
    .select("id, status, company_name")
    .eq("user_id", user.id)
    .maybeSingle()

  if (cpError) {
    return { ok: false, error: "Database error retrieving company profile", status: 500 as const }
  }

  if (!companyProfile) {
    return { ok: false, error: "Forbidden: Company profile not found", status: 404 as const }
  }

  if (companyProfile.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Forbidden: Your corporate account must be approved before you can perform recruitment actions.",
      status: 403 as const,
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
    companyProfile,
    companyId: companyProfile.id,
  }
}
