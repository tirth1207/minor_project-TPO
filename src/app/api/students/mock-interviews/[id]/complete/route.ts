export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    const role = user.app_metadata?.role
    if (role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    // Get the mock interview - read only, no status transitions
    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*, retry_count")
      .eq("id", id)
      .eq("student_id", student.id)
      .maybeSingle()

    if (fetchError || !mock) {
      return NextResponse.json({ error: "Mock interview not found" }, { status: 404 })
    }

    return NextResponse.json({ mock })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Redirect to the proper submit endpoint
    return NextResponse.json(
      { error: "Use POST /api/students/mock-interviews/[id]/submit for answer submission" },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}