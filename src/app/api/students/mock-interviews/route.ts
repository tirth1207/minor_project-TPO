export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

const MAX_ROLE_LENGTH = 120

export async function GET() {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth

    const { data: mocks, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("[Mock GET] Database error:", error)
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Unable to load mock interviews" },
        { status: 500 }
      )
    }

    const mockList = mocks || []
    return NextResponse.json({
      success: true,
      data: { mocks: mockList },
      mocks: mockList,
    })
  } catch (err: unknown) {
    console.error("[Mock GET] Unexpected error:", err)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-create:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId } = auth
    const body = await request.json().catch(() => ({}))

    const role = typeof body.role === "string"
      ? body.role.trim()
      : "Full Stack Developer"

    if (!role || role.length > MAX_ROLE_LENGTH) {
      return NextResponse.json(
        { success: false, code: "INVALID_ROLE", error: `Role must be between 1 and ${MAX_ROLE_LENGTH} characters` },
        { status: 400 }
      )
    }

    const { data: mockRecord, error } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        mock_type: "PRACTICE",
        job_role_context: role,
        questions: [],
        status: "QUEUED",
      })
      .select()
      .single()

    if (error) {
      console.error("[Mock POST] Database error:", error)
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: "Unable to create mock interview" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { mock: mockRecord },
        mock: mockRecord,
        message: "Practice mock interview session created",
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    console.error("[Mock POST] Unexpected error:", err)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}
