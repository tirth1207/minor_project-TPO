export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    // Fetch all rounds for this application and verify company ownership
    const { data: rounds, error } = await supabase
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
      .eq("application_id", applicationId)
      .order("id", { ascending: true })

    if (error) {
      console.error("[COMPANY APPLICATION ROUNDS GET]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Verify the application belongs to a job from this company
    if (!rounds || rounds.length === 0) {
      // Check if the application exists and belongs to the company
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          job_college_mapping:job_college_mappings!inner(
            job:job_postings!inner(
              company_id
            )
          )
        `)
        .eq("id", applicationId)
        .maybeSingle()

      if (appError) {
        console.error("[COMPANY APPLICATION ROUNDS GET APP]", appError)
        return NextResponse.json(
          { error: "Failed to verify application" },
          { status: 500 }
        )
      }

      if (!application ||
          !application.job_college_mapping ||
          !application.job_college_mapping.job ||
          application.job_college_mapping.job.company_id !== companyId) {
        return NextResponse.json(
          { error: "Application not found or unauthorized access" },
          { status: 404 }
        )
      }
    } else {
      // Verify ownership through the first round's application
      const firstRound = rounds[0]
      if (!firstRound.application ||
          !firstRound.application.job_college_mapping ||
          !firstRound.application.job_college_mapping.job ||
          firstRound.application.job_college_mapping.job.company_id !== companyId) {
        return NextResponse.json(
          { error: "Application not found or unauthorized access" },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ rounds })
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUNDS GET]", error)
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const auth = await requireActiveCompany()

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth
    const body = await request.json()

    const { round_name } = body

    // Validate input
    if (!round_name || typeof round_name !== "string" || round_name.trim() === "") {
      return NextResponse.json(
        { error: "Round name is required" },
        { status: 400 }
      )
    }

    // Verify the application belongs to a job from this company
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        id,
        job_college_mapping:job_college_mappings!inner(
          job:job_postings!inner(
            company_id
          )
        )
      `)
      .eq("id", applicationId)
      .maybeSingle()

    if (appError) {
      console.error("[COMPANY APPLICATION ROUNDS POST APP]", appError)
      return NextResponse.json(
        { error: "Failed to verify application" },
        { status: 500 }
      )
    }

    if (!application ||
        !application.job_college_mapping ||
        !application.job_college_mapping.job ||
        application.job_college_mapping.job.company_id !== companyId) {
      return NextResponse.json(
        { error: "Application not found or unauthorized access" },
        { status: 404 }
      )
    }

    // Create the new round
    const { data: round, error } = await supabase
      .from("application_rounds")
      .insert({
        application_id: applicationId,
        round_name: round_name.trim(),
        status: "PENDING" as const, // Default status
        company_feedback: null
      })
      .select()
      .single()

    if (error) {
      console.error("[COMPANY APPLICATION ROUNDS POST]", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { round, message: "Interview round created successfully" },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("[COMPANY APPLICATION ROUNDS POST]", error)
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