export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { requireUser } from "@/lib/auth/require-user"
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

    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
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

    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 })
    }

    // Verify mock interview ownership
    const { data: mock, error: mockError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (mockError || !mock) {
      return NextResponse.json({ error: "Mock interview not found" }, { status: 404 })
    }

    // Simulate AI scoring (75-95)
    const score = Math.floor(Math.random() * 21) + 75 // 75 to 95

    // Build constructed critique feedback based on answers provided
    let constructiveFeedback = ""
    if (mock.job_role_context.toLowerCase().includes("front") || mock.job_role_context.toLowerCase().includes("react")) {
      constructiveFeedback = `### AI Interview Feedback: Frontend Engineer (Score: ${score}%)

**Strengths:**
- Demonstrates deep conceptual understanding of the Next.js App Router and the technical segregation between Server Components (RSC) and Client Components.
- Articulated the virtual DOM reconciliation process extremely well with clear reference to efficient UI rendering updates.

**Areas for Improvement:**
- Could expand on actual performance audit metrics such as Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) when explaining page load optimization.
- Consider discussing hydration boundaries and code bundling implications in larger production applications.`
    } else if (mock.job_role_context.toLowerCase().includes("back") || mock.job_role_context.toLowerCase().includes("node") || mock.job_role_context.toLowerCase().includes("sql")) {
      constructiveFeedback = `### AI Interview Feedback: Backend Engineer (Score: ${score}%)

**Strengths:**
- Solid architectural grasp of concurrent schema design, transaction isolation levels, and preventatives for common race conditions.
- Clear understanding of the differences between normalized SQL databases and scalable NoSQL stores.

**Areas for Improvement:**
- Ensure you mention JWT security best practices, such as storing access tokens in short-lived memory and refresh tokens in HttpOnly, secure cookies.
- Could go into deeper detail regarding indexing strategies (e.g., Composite/B-Tree Indexes) for query optimization.`
    } else {
      constructiveFeedback = `### AI Interview Feedback: Technical Candidate (Score: ${score}%)

**Strengths:**
- Structured, logical, and methodical approach to troubleshooting and engineering design tradeoffs.
- Excellent interpersonal communication, showing collaborative problem-solving skills under tight deadlines.

**Areas for Improvement:**
- When explaining complex trade-offs, remember to back up your decisions with quantifiable data or explicit business impact metrics.
- Expand your examples with specific industry tools (e.g., logging/monitoring suites, cloud provider scaling limits).`
    }

    // Update mock interview row
    const { data: updatedMock, error: updateError } = await supabase
      .from("mock_interviews")
      .update({
        answers: answers,
        ai_score: score,
        ai_feedback: constructiveFeedback,
        status: "COMPLETED",
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ mock: updatedMock })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
