export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    // Fetch the specific round and verify company ownership
    const { data: round, error } = await supabase
      .from("application_rounds")
      .select(`
        id,
        round_name,
        status,
        company_feedback,
        application:applications!inner(
          job_college_mapping:job_college_mappings!inner(
            job:job_postings!inner(
              company_id
            )
          )
        )
      `)
      .eq("id", roundId)
      .eq("application_id", applicationId)
      .maybeSingle()

    if (error) {
      console.error("[COMPANY APPLICATION ROUND GET]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!round) {
      return NextResponse.json(
        { error: "Round not found" },
        { status: 404 }
      )
    }

    // Verify the application belongs to a job from this company
    if (!round.application ||
        !round.application.job_college_mapping ||
        !round.application.job_college_mapping.job ||
        round.application.job_college_mapping.job.company_id !== companyId) {
      return NextResponse.json(
        { error: "Application not found or unauthorized access" },
        { status: 403 }
      )
    }

    return NextResponse.json({ round })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND GET]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth
    const body = await request.json()

    const { round_name, status, company_feedback } = body

    // Validate input
    if (round_name !== undefined && 
        (typeof round_name !== "string" || round_name.trim() === "")) {
      return NextResponse.json(
        { error: "Invalid round name" },
        { status: 400 }
      )
    }

    if (status !== undefined && 
        !["PENDING", "SCHEDULED", "CLEARED", "FAILED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      )
    }

    // Verify the application belongs to a job from this company and get the round
    const { data: round, error: roundError } = await supabase
      .from("application_rounds")
      .select(`
        id,
        application:applications!inner(
          job_college_mapping:job_college_mappings!inner(
            job:job_postings!inner(
              company_id
            )
          )
        )
      `)
      .eq("id", roundId)
      .eq("application_id", applicationId)
      .maybeSingle()

    if (roundError) {
      console.error("[COMPANY APPLICATION ROUND PATCH VERIFY]", roundError)
      return NextResponse.json(
        { error: "Failed to verify round" },
        { status: 500 }
      )
    }

    if (!round ||
        !round.application ||
        !round.application.job_college_mapping ||
        !round.application.job_college_mapping.job ||
        round.application.job_college_mapping.job.company_id !== companyId) {
      return NextResponse.json(
        { error: "Round not found or unauthorized access" },
        { status: 404 }
      )
    }

    // Update the round
    const updateData: any = {}
    if (round_name !== undefined) updateData.round_name = round_name.trim()
    if (status !== undefined) updateData.status = status
    if (company_feedback !== undefined) updateData.company_feedback = company_feedback

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update provided" },
        { status: 400 }
      )
    }

    const { data: updatedRound, error } = await supabase
      .from("application_rounds")
      .update(updateData)
      .eq("id", roundId)
      .select()
      .single()

    if (error) {
      console.error("[COMPANY APPLICATION ROUND PATCH]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      round: updatedRound,
      message: "Interview round updated successfully"
    })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND PATCH]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> }
) {
  try {
    const { id: applicationId, roundId } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    // Verify the application belongs to a job from this company and get the round
    const { data: round, error: roundError } = await supabase
      .from("application_rounds")
      .select(`
        id,
        application:applications!inner(
          job_college_mapping:job_college_mappings!inner(
            job:job_postings!inner(
              company_id
            )
          )
        )
      `)
      .eq("id", roundId)
      .eq("application_id", applicationId)
      .maybeSingle()

    if (roundError) {
      console.error("[COMPANY APPLICATION ROUND DELETE VERIFY]", roundError)
      return NextResponse.json(
        { error: "Failed to verify round" },
        { status: 500 }
      )
    }

    if (!round ||
        !round.application ||
        !round.application.job_college_mapping ||
        !round.application.job_college_mapping.job ||
        round.application.job_college_mapping.job.company_id !== companyId) {
      return NextResponse.json(
        { error: "Round not found or unauthorized access" },
        { status: 404 }
      )
    }

    // Delete the round
    const { error } = await supabase
      .from("application_rounds")
      .delete()
      .eq("id", roundId)

    if (error) {
      console.error("[COMPANY APPLICATION ROUND DELETE]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Interview round deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUND DELETE]", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}