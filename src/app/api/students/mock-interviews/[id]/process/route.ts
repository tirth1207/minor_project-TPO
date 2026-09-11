export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

type RouteContext = {
  params: Promise<{ id: string }>
}

const PROCESSING_LEASE_MS = 10 * 60 * 1000

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, code: "INVALID_ID", error: "Mock interview ID is required" },
        { status: 400 }
      )
    }

    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth
    const rateLimit = checkRateLimit(`mock-process:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    })
    if (!rateLimit.success) return rateLimitResponse()

    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (fetchError) {
      console.error("[Mock Process] Fetch error:", fetchError)
      return NextResponse.json(
        { success: false, code: "DATABASE_ERROR", error: "Failed to fetch mock interview session" },
        { status: 500 }
      )
    }

    if (!mock) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Mock interview session not found" },
        { status: 404 }
      )
    }

    if (mock.status === "ANSWERING" || mock.status === "EVALUATED") {
      return NextResponse.json({ success: true, data: { mock, alreadyProcessed: true } })
    }

    const nowMs = Date.now()
    const updatedAt = mock.updated_at ? new Date(mock.updated_at).getTime() : 0
    const staleThreshold = new Date(nowMs - PROCESSING_LEASE_MS).toISOString()

    if (mock.status === "PROCESSING" && updatedAt > nowMs - PROCESSING_LEASE_MS) {
      return NextResponse.json({
        success: true,
        data: { mock, inProgress: true },
        message: "Interview generation is already in progress",
      })
    }

    const now = new Date(nowMs).toISOString()
    const { data: lockedMock, error: lockError } = await supabase
      .from("mock_interviews")
      .update({ status: "PROCESSING", updated_at: now })
      .eq("id", id)
      .eq("student_id", studentId)
      .or([
        "status.in.(QUEUED,REQUESTED,FAILED)",
        `and(status.eq.PROCESSING,updated_at.lt.${staleThreshold})`,
      ].join(","))
      .select("*")
      .maybeSingle()

    if (lockError) {
      console.error("[Mock Process] Lock error:", lockError)
      return NextResponse.json(
        { success: false, code: "LOCK_ERROR", error: "Failed to start interview processing" },
        { status: 500 }
      )
    }

    if (!lockedMock) {
      const { data: latestMock, error: latestError } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("id", id)
        .eq("student_id", studentId)
        .maybeSingle()

      if (latestError) {
        console.error("[Mock Process] Latest state fetch error:", latestError)
        return NextResponse.json(
          { success: false, code: "DATABASE_ERROR", error: "Failed to fetch current interview state" },
          { status: 500 }
        )
      }

      if (latestMock?.status === "ANSWERING" || latestMock?.status === "EVALUATED") {
        return NextResponse.json({
          success: true,
          data: { mock: latestMock, alreadyProcessed: true },
        })
      }

      return NextResponse.json({
        success: true,
        data: { mock: latestMock || mock, inProgress: true },
        message: "Interview generation is already in progress",
      })
    }

    const activeMock = lockedMock

    let careerProfile: Record<string, unknown> | null = null
    if (activeMock.mock_type !== "JOB_REQUIRED") {
      const { data: profile, error: profileError } = await supabase
        .from("student_career_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle()

      if (profileError) console.warn("[Mock Process] Career profile error:", profileError)
      careerProfile = profile || null
    }

    try {
      const generatedQuestions = activeMock.mock_type === "JOB_REQUIRED"
        ? await generateStructuredMockInterview(
            "JOB_REQUIRED",
            activeMock.job_role_context || "Job Candidate",
            activeMock.job_spec_snapshot
          )
        : await generateStructuredMockInterview(
            "PRACTICE",
            activeMock.job_role_context || "Full Stack Developer",
            null,
            careerProfile
          )

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length < 3) {
        throw new Error("AI generated an invalid interview question set")
      }

      const { data: updatedMock, error: updateError } = await supabase
        .from("mock_interviews")
        .update({
          status: "ANSWERING",
          questions: generatedQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("student_id", studentId)
        .eq("status", "PROCESSING")
        .select("*")
        .single()

      if (updateError) throw new Error("Failed to save generated interview")

      return NextResponse.json({
        success: true,
        data: { mock: updatedMock },
        message: "Interview questions generated successfully",
      })
    } catch (generationError: unknown) {
      console.error("[Mock Process] Generation error:", generationError)

      const { data: failedMock, error: failedUpdateError } = await supabase
        .from("mock_interviews")
        .update({ status: "FAILED", retry_count: activeMock.retry_count + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("student_id", studentId)
        .eq("status", "PROCESSING")
        .select("*")
        .maybeSingle()

      if (failedUpdateError) console.error("[Mock Process] Failed status update:", failedUpdateError)

      return NextResponse.json(
        {
          success: false,
          code: "GENERATION_FAILED",
          error: "We could not generate the interview right now. Please try again.",
          data: { mock: failedMock || activeMock },
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("[Mock Process] Unexpected error:", error)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}
