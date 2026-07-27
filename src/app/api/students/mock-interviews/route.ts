export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
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

    const { data: mockInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", student.id)
      .order("id", { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    return NextResponse.json({ mockInterviews })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, studentId } = auth

    const { jobRoleContext } = await request.json()
    if (!jobRoleContext || typeof jobRoleContext !== "string") {
      return NextResponse.json({ error: "jobRoleContext is required" }, { status: 400 })
    }

    // Seed realistic questions based on the role context
    let seededQuestions = []
    const normalizedRole = jobRoleContext.toLowerCase().trim()

    if (normalizedRole.includes("front") || normalizedRole.includes("react")) {
      seededQuestions = [
        { id: 1, text: "Explain the difference between Server and Client Components in Next.js (App Router)." },
        { id: 2, text: "Describe how the virtual DOM works and how React uses reconciliation to optimize rendering." },
        { id: 3, text: "How do you optimize a web application's initial loading performance (e.g., Code Splitting, Lazy Loading)?" }
      ]
    } else if (normalizedRole.includes("back") || normalizedRole.includes("node") || normalizedRole.includes("sql")) {
      seededQuestions = [
        { id: 1, text: "How do you design a database schema for a high-concurrency application to avoid race conditions?" },
        { id: 2, text: "Explain the differences between SQL and NoSQL databases and their respective sweet spots." },
        { id: 3, text: "How would you implement secure token-based authentication (JWT) and handle token expiration/revocation?" }
      ]
    } else if (normalizedRole.includes("full")) {
      seededQuestions = [
        { id: 1, text: "Describe the lifecycle of an HTTP request from typing the URL to rendering the page in the browser." },
        { id: 2, text: "Explain how you would handle complex state management across frontend and backend systems." },
        { id: 3, text: "What is your approach to horizontal versus vertical scaling for web servers and databases?" }
      ]
    } else {
      // Default / Behavioral and general technical questions
      seededQuestions = [
        { id: 1, text: "Describe a challenging technical problem you solved. What was your systematic approach to resolving it?" },
        { id: 2, text: "How do you stay up-to-date with fast-changing technologies and apply them to real projects?" },
        { id: 3, text: "Describe a situation where you had to make a trade-off between clean code and meeting a tight release deadline." }
      ]
    }

    const { data: mockInterview, error: insertError } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        job_role_context: jobRoleContext,
        questions: seededQuestions,
        answers: [],
        status: "READY",
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ mockInterview }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
