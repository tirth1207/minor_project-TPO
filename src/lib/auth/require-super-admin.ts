import { createClient } from "@/lib/supabase/server"

export async function requireSuperAdmin() {
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

  if (role !== "SA") {
    return { ok: false, error: "Forbidden: Super Admin access only", status: 403 as const }
  }

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
  }
}
