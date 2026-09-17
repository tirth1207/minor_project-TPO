export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

function sanitizeQuestions(questions: any[]) {
  if (!Array.isArray(questions)) return []
  return questions.map((q) => {
    if (q.type === "MCQ") {
      const { correctOptionId, explanation, ...rest } = q
      return rest
    }
    if (q.type === "THEORY" || q.type === "BEHAVIORAL") {
      const { rubric, referenceAnswer, ...rest } = q
      return rest
    }
    return q
  })
}

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
        { success: false, code: "NOT_FOUND", error: "Mock interview session not found" },
        { status: 404 }
      )
    }

    const sanitizedMock = {
      ...mock,
      questions: mock.status === "EVALUATED" ? mock.questions : sanitizeQuestions(mock.questions),
    }

    return NextResponse.json({
      success: true,
      data: { mock: sanitizedMock },
      mock: sanitizedMock,
    })
  } catch (err: unknown) {
    console.error("GET /api/students/mock-interviews/[id] error:", err)
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: "Internal server error" },
      { status: 500 }
    )
  }
}
