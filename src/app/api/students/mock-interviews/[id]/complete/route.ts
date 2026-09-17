export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const { supabase, studentId } = auth

    const { data: mock, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (error || !mock) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Mock interview not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { mock },
      mock,
    })
  } catch (error: unknown) {
    console.error("GET /api/students/mock-interviews/[id]/complete error:", error)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "INVALID_ENDPOINT",
      error: "Use POST /api/students/mock-interviews/[id]/submit for answer submission",
    },
    { status: 400 }
  )
}
