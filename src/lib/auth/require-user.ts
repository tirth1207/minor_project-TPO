import { createClient } from "@/lib/supabase/server"

export async function requireUser() {
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

  return {
    ok: true as const,
    supabase,
    user,
    dbUser: dbUser || null,
  }
}
