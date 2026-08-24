export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

// Sanitization helper to remove answer keys and rubrics
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
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth

    const { data: mock, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .single()

    if (error || !mock) {
      return NextResponse.json({ error: "Mock interview session not found" }, { status: 404 })
    }

    // Hide answers if still answering
    const sanitizedMock = {
      ...mock,
      questions: mock.status === "EVALUATED" ? mock.questions : sanitizeQuestions(mock.questions),
    }

    return NextResponse.json({ mock: sanitizedMock })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
