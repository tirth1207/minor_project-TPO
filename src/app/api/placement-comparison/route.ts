import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const scopes = new Set(["college", "department", "mentor", "company"])

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const scope = new URL(request.url).searchParams.get("scope") || "college"
  if (!scopes.has(scope)) return NextResponse.json({ error: "Invalid scope" }, { status: 400 })

  const { data: actor } = await supabase
    .from("users")
    .select("id,role,org_id,dept_id")
    .eq("id", user.id)
    .single()

  if (!actor || !["SA", "COLLEGE_ADMIN", "MENTOR"].includes(actor.role)) {
    return NextResponse.json({ error: "You do not have permission to view comparison data" }, { status: 403 })
  }

  if (actor.role === "MENTOR" && !["college", "department", "mentor"].includes(scope)) {
    return NextResponse.json({ error: "Mentors cannot view company comparison data" }, { status: 403 })
  }

  let query = supabase
    .from("placement_comparison_records")
    .select("*")
    .eq("scope_type", scope)
    .order("academic_year", { ascending: false })

  if (actor.role !== "SA") {
    query = query.eq("org_id", actor.org_id)
  }

  if (actor.role === "MENTOR") {
    if (scope === "department") {
      query = query.eq("department_id", actor.dept_id)
    } else if (scope === "mentor") {
      query = query.eq("mentor_id", actor.id)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const { data: actor } = await supabase.from("users").select("id,role,org_id,dept_id").eq("id", user.id).single()
  if (!actor || !["SA", "COLLEGE_ADMIN", "MENTOR"].includes(actor.role)) {
    return NextResponse.json({ error: "You do not have permission to manage comparison data" }, { status: 403 })
  }

  const body = await request.json()
  const numericFields = ["academic_year","total_students","eligible_students","placed_students","companies_participated","total_offers","avg_ctc","median_ctc","highest_ctc","lowest_ctc"]
  for (const field of numericFields) {
    if (typeof body[field] !== "number" || !Number.isFinite(body[field])) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
  }
  if (!scopes.has(body.scope_type)) return NextResponse.json({ error: "Invalid scope_type" }, { status: 400 })
  if (body.eligible_students > body.total_students || body.placed_students > body.eligible_students || body.total_offers < body.placed_students) return NextResponse.json({ error: "Placement counts are inconsistent" }, { status: 400 })

  if (actor.role === "MENTOR" && body.scope_type !== "mentor") {
    return NextResponse.json({ error: "Mentors can only manage mentor placement data" }, { status: 403 })
  }

  let orgId = actor.org_id
  if (actor.role === "SA") {
    orgId = body.org_id || orgId
  }
  if (!orgId) return NextResponse.json({ error: "No organization selected" }, { status: 400 })

  const record = {
    org_id: orgId,
    academic_year: Math.trunc(body.academic_year),
    scope_type: body.scope_type,
    department_id: body.department_id || null,
    mentor_id: actor.role === "MENTOR" ? actor.id : (body.mentor_id || null),
    company_id: body.company_id || null,
    department_name: body.department_name || null,
    mentor_name: body.mentor_name || null,
    company_name: body.company_name || null,
    total_students: body.total_students,
    eligible_students: body.eligible_students,
    placed_students: body.placed_students,
    companies_participated: body.companies_participated,
    total_offers: body.total_offers,
    avg_ctc: body.avg_ctc,
    median_ctc: body.median_ctc,
    highest_ctc: body.highest_ctc,
    lowest_ctc: body.lowest_ctc,
    created_by: user.id,
  }

  const { data: existing } = await supabase.from("placement_comparison_records").select("id").match({
    org_id: record.org_id,
    academic_year: record.academic_year,
    scope_type: record.scope_type,
    ...(record.scope_type === "department" ? { department_id: record.department_id } : {}),
    ...(record.scope_type === "mentor" ? { mentor_id: record.mentor_id } : {}),
    ...(record.scope_type === "company" ? { company_id: record.company_id } : {}),
  }).limit(1).maybeSingle()

  const result = existing
    ? await supabase.from("placement_comparison_records").update(record).eq("id", existing.id).select().single()
    : await supabase.from("placement_comparison_records").insert(record).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ data: result.data }, { status: existing ? 200 : 201 })
}
