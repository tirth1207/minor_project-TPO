import { createClient } from "@/lib/supabase/server"

export async function requireActiveMentor() {
  const supabase = await createClient()

  // -----------------------------------------------------
  // Authenticate
  // -----------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false as const,
      error: "Unauthorized",
      status: 401 as const,
    }
  }

  // -----------------------------------------------------
  // Public user
  // -----------------------------------------------------

  const {
    data: dbUser,
    error: dbUserError,
  } = await supabase
    .from("users")
    .select(`
      id,
      role,
      org_id,
      dept_id
    `)
    .eq("id", user.id)
    .maybeSingle()

  if (dbUserError) {
    console.error(
      "requireActiveMentor: failed to fetch user:",
      dbUserError
    )

    return {
      ok: false as const,
      error: "Database error retrieving user metadata",
      status: 500 as const,
    }
  }

  if (!dbUser) {
    return {
      ok: false as const,
      error: "Mentor user record not found",
      status: 403 as const,
    }
  }

  // Do NOT rely on app_metadata as fallback.
  // public.users is our source of truth.

  if (dbUser.role !== "MENTOR") {
    return {
      ok: false as const,
      error: "Forbidden: Mentor access only",
      status: 403 as const,
    }
  }

  if (!dbUser.org_id) {
    return {
      ok: false as const,
      error: "Forbidden: Mentor is not assigned to an organization",
      status: 403 as const,
    }
  }

  if (!dbUser.dept_id) {
    return {
      ok: false as const,
      error: "Forbidden: Mentor is not assigned to a department",
      status: 403 as const,
    }
  }

  const orgId = dbUser.org_id
  const deptId = dbUser.dept_id

  // -----------------------------------------------------
  // Mentor profile
  // -----------------------------------------------------

  const {
    data: mentor,
    error: mentorError,
  } = await supabase
    .from("mentor_profiles")
    .select(`
      id,
      user_id,
      name,
      employee_id,
      profile_status
    `)
    .eq("user_id", user.id)
    .maybeSingle()

  if (mentorError) {
    console.error(
      "requireActiveMentor: failed to fetch mentor profile:",
      mentorError
    )

    return {
      ok: false as const,
      error: "Database error retrieving mentor profile",
      status: 500 as const,
    }
  }

  if (!mentor) {
    return {
      ok: false as const,
      error: "Forbidden: Mentor profile not found",
      status: 403 as const,
    }
  }

  if (mentor.profile_status !== "APPROVED") {
    return {
      ok: false as const,
      error:
        mentor.profile_status === "REJECTED"
          ? "Forbidden: Your mentor account has been rejected."
          : "Forbidden: Your mentor account is awaiting approval.",
      status: 403 as const,
    }
  }

  // -----------------------------------------------------
  // Organization
  // -----------------------------------------------------

  const {
    data: organization,
    error: orgError,
  } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      status
    `)
    .eq("id", orgId)
    .maybeSingle()

  if (orgError) {
    console.error(
      "requireActiveMentor: failed to fetch organization:",
      orgError
    )

    return {
      ok: false as const,
      error: "Database error retrieving organization",
      status: 500 as const,
    }
  }

  if (!organization) {
    return {
      ok: false as const,
      error: "Forbidden: Organization not found.",
      status: 403 as const,
    }
  }

  if (organization.status !== "ACTIVE") {
    return {
      ok: false as const,
      error: "Forbidden: Your organization account is not active.",
      status: 403 as const,
    }
  }

  // -----------------------------------------------------
  // Department
  // -----------------------------------------------------

  const {
    data: department,
    error: deptError,
  } = await supabase
    .from("departments")
    .select(`
      id,
      name,
      status,
      org_id
    `)
    .eq("id", deptId)
    .maybeSingle()

  if (deptError) {
    console.error(
      "requireActiveMentor: failed to fetch department:",
      deptError
    )

    return {
      ok: false as const,
      error: "Database error retrieving department",
      status: 500 as const,
    }
  }

  if (!department) {
    return {
      ok: false as const,
      error: "Forbidden: Department not found.",
      status: 403 as const,
    }
  }

  if (department.org_id !== orgId) {
    return {
      ok: false as const,
      error:
        "Forbidden: Department does not belong to your organization.",
      status: 403 as const,
    }
  }

  if (department.status !== "ACTIVE") {
    return {
      ok: false as const,
      error: "Forbidden: Your department is not active.",
      status: 403 as const,
    }
  }

  // -----------------------------------------------------
  // Authorized
  // -----------------------------------------------------

  return {
    ok: true as const,

    supabase,
    user,

    dbUser,
    mentor,
    organization,
    department,

    orgId,
    deptId,
    mentorId: mentor.id,
  }
}