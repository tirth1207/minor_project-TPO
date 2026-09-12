export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

const ROUND_STATUSES = ["PENDING", "SCHEDULED", "CLEARED", "FAILED"] as const
type RoundStatus = (typeof ROUND_STATUSES)[number]

function isValidStatus(value: unknown): value is RoundStatus {
  return typeof value === "string" && ROUND_STATUSES.includes(value as RoundStatus)
}

function canTransition(from: RoundStatus, to: RoundStatus): boolean {
  if (from === to) return true
  if (from === "CLEARED" || from === "FAILED") return false
  if (from === "PENDING") return to === "SCHEDULED" || to === "CLEARED" || to === "FAILED"
  if (from === "SCHEDULED") return to === "PENDING" || to === "CLEARED" || to === "FAILED"
  return false
}

async function getOwnedRound(supabase: Awaited<ReturnType<typeof requireActiveCompany>> extends infer T ? T extends { ok: true; supabase: infer S } ? S : never : never, applicationId: string, roundId: string, companyId: string) {
  return supabase
    .from("application_rounds")
    .select(`
      id,
      round_name,
      status,
      company_feedback,
      application:applications!inner(
        job_college_mapping:job_college_mappings!inner(
          job:job_postings!inner(company_id)
        )
      )
    `)
    .eq("id", roundId)
    .eq("application_id", applicationId)
    .maybeSingle()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { data: round, error } = await getOwnedRound(auth.supabase, applicationId, roundId, auth.companyId)
    if (error) {
      console.error("[COMPANY APPLICATION ROUND GET]", error)
      return NextResponse.json({ error: "Failed to load interview round" }, { status: 500 })
    }

    if (!round || round.application?.job_college_mapping?.job?.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Round not found or unauthorized access" }, { status: 404 })
    }

    return NextResponse.json({
      round: {
        id: round.id,
        round_name: round.round_name,
        status: round.status,
        company_feedback: round.company_feedback,
      },
    })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND GET]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { round_name, status, company_feedback } = body

    if (round_name !== undefined && (typeof round_name !== "string" || round_name.trim() === "" || round_name.trim().length > 120)) {
      return NextResponse.json({ error: "Round name must be between 1 and 120 characters" }, { status: 400 })
    }

    if (status !== undefined && !isValidStatus(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    if (company_feedback !== undefined && company_feedback !== null && (typeof company_feedback !== "string" || company_feedback.length > 5000)) {
      return NextResponse.json({ error: "Company feedback must be at most 5000 characters" }, { status: 400 })
    }

    const { data: round, error: roundError } = await getOwnedRound(auth.supabase, applicationId, roundId, auth.companyId)
    if (roundError) {
      console.error("[COMPANY APPLICATION ROUND PATCH VERIFY]", roundError)
      return NextResponse.json({ error: "Failed to verify round" }, { status: 500 })
    }

    if (!round || round.application?.job_college_mapping?.job?.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Round not found or unauthorized access" }, { status: 404 })
    }

    if (status !== undefined && !canTransition(round.status as RoundStatus, status)) {
      return NextResponse.json(
        { error: `Invalid round transition from ${round.status} to ${status}` },
        { status: 409 }
      )
    }

    const updateData: Record<string, string | null> = {}
    if (round_name !== undefined) updateData.round_name = round_name.trim()
    if (status !== undefined) updateData.status = status
    if (company_feedback !== undefined) updateData.company_feedback = company_feedback === null ? null : company_feedback

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update provided" }, { status: 400 })
    }

    const { data: updatedRound, error } = await auth.supabase
      .from("application_rounds")
      .update(updateData)
      .eq("id", roundId)
      .eq("application_id", applicationId)
      .select("id, round_name, status, company_feedback")
      .single()

    if (error) {
      console.error("[COMPANY APPLICATION ROUND PATCH]", error)
      return NextResponse.json({ error: "Failed to update interview round" }, { status: 500 })
    }

    return NextResponse.json({ round: updatedRound, message: "Interview round updated successfully" })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND PATCH]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { data: round, error: roundError } = await getOwnedRound(auth.supabase, applicationId, roundId, auth.companyId)
    if (roundError) {
      console.error("[COMPANY APPLICATION ROUND DELETE VERIFY]", roundError)
      return NextResponse.json({ error: "Failed to verify round" }, { status: 500 })
    }

    if (!round || round.application?.job_college_mapping?.job?.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Round not found or unauthorized access" }, { status: 404 })
    }

    // Interview history is an audit trail. Once a round is scheduled or has a
    // result, it must not be physically deleted. A pending draft round may be removed.
    if (round.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending draft rounds can be deleted; scheduled or completed rounds are part of the interview history." },
        { status: 409 }
      )
    }

    const { error } = await auth.supabase
      .from("application_rounds")
      .delete()
      .eq("id", roundId)
      .eq("application_id", applicationId)

    if (error) {
      console.error("[COMPANY APPLICATION ROUND DELETE]", error)
      return NextResponse.json({ error: "Failed to delete interview round" }, { status: 500 })
    }

    return NextResponse.json({ message: "Interview round deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND DELETE]", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
