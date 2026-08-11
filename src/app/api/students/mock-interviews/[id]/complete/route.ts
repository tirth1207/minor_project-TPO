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

    // Get the mock interview
    const { data: mock, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*, retry_count")
      .eq("id", id)
      .eq("student_id", student.id)
      .maybeSingle()

    if (fetchError || !mock) {
      return NextResponse.json({ error: "Mock interview not found" }, { status: 404 })
    }

    // Process if REQUESTED or QUEUED
    if (mock.status === "REQUESTED") {
      // Set to QUEUED
      await supabase
        .from("mock_interviews")
        .update({ status: "QUEUED" })
        .eq("id", id)

      // Update mock status for response
      mock.status = "QUEUED"
    } else if (mock.status === "QUEUED") {
      try {
        // Set status to PROCESSING
        await supabase
          .from("mock_interviews")
          .update({ status: "PROCESSING" })
          .eq("id", id)

        // Simulate processing delay (NVIDIA NIM service call)
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Generate questions based on job role context (simulating NVIDIA NIM service)
        let generatedQuestions = []
        const normalizedRole = mock.job_role_context.toLowerCase().trim()

        if (normalizedRole.includes("front") || normalizedRole.includes("react")) {
          generatedQuestions = [
            { id: 1, text: "Explain the difference between Server and Client Components in Next.js (App Router)." },
            { id: 2, text: "Describe how the virtual DOM works and how React uses reconciliation to optimize rendering." },
            { id: 3, text: "How do you optimize a web application's initial loading performance (e.g., Code Splitting, Lazy Loading)?" }
          ]
        } else if (normalizedRole.includes("back") || normalizedRole.includes("node") || normalizedRole.includes("sql")) {
          generatedQuestions = [
            { id: 1, text: "How do you design a database schema for a high-concurrency application to avoid race conditions?" },
            { id: 2, text: "Explain the differences between SQL and NoSQL databases and their respective sweet spots." },
            { id: 3, text: "How would you implement secure token-based authentication (JWT) and handle token expiration/revocation?" }
          ]
        } else if (normalizedRole.includes("full")) {
          generatedQuestions = [
            { id: 1, text: "Describe the lifecycle of an HTTP request from typing the URL to rendering the page in the browser." },
            { id: 2, text: "Explain how you would handle complex state management across frontend and backend systems." },
            { id: 3, text: "What is your approach to horizontal versus vertical scaling for web servers and databases?" }
          ]
        } else {
          // Default / Behavioral and general technical questions
          generatedQuestions = [
            { id: 1, text: "Describe a challenging technical problem you solved. What was your systematic approach to resolving it?" },
            { id: 2, text: "How do you stay up-to-date with fast-changing technologies and apply them to real projects?" },
            { id: 3, text: "Describe a situation where you had to make a trade-off between clean code and meeting a tight release deadline." }
          ]
        }

        // Update with generated questions and set status to COMPLETED (questions ready)
        const { data: updatedMock, error: updateError } = await supabase
          .from("mock_interviews")
          .update({
            questions: generatedQuestions,
            status: "COMPLETED", // Questions are ready for student to answer
          })
          .eq("id", id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        // Send notification to student that mock interview questions are ready
        await supabase
          .from("notifications")
          .insert({
            user_id: student.id,
            title: "Mock Interview Ready",
            message: `Your mock interview for "${mock.job_role_context}" is ready. You can now start answering the questions.`,
            is_read: false
          })

        // Update mock for response
        mock.questions = generatedQuestions
        mock.status = "COMPLETED"
      } catch (error) {
        // Set status to FAILED on error, increment retry count
        // If retry count exceeds max retries (3), keep as FAILED
        // Otherwise, set back to QUEUED for retry
        const newRetryCount = mock.retry_count + 1
        if (newRetryCount >= 3) {
          await supabase
            .from("mock_interviews")
            .update({ 
              status: "FAILED",
              retry_count: newRetryCount
            })
            .eq("id", id)
          
          // Send notification of failure after max retries
          await supabase
            .from("notifications")
            .insert({
              user_id: student.id,
              title: "Mock Interview Processing Failed",
              message: `Your mock interview for "${mock.job_role_context}" failed to process after ${newRetryCount} attempts. Please try creating a new mock interview.`,
              is_read: false
            })
        } else {
          await supabase
            .from("mock_interviews")
            .update({ 
              status: "QUEUED", // Reset to QUEUED for retry
              retry_count: newRetryCount
            })
            .eq("id", id)
        }
        mock.status = "FAILED"
      }
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

    // Verify mock interview ownership and that it's ready for answers
    const { data: mock, error: mockError } = await supabase
      .from("mock_interviews")
      .select("*, retry_count")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle()

    if (mockError || !mock) {
      return NextResponse.json({ error: "Mock interview not found" }, { status: 404 })
    }

    // Check if mock interview is in COMPLETED status (questions generated and ready)
    if (mock.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Mock interview is not ready for answering. Current status: ${mock.status}` },
        { status: 400 }
      )
    }

    // Set status to PROCESSING while we evaluate answers
    await supabase
      .from("mock_interviews")
      .update({ status: "PROCESSING" })
      .eq("id", id)

    // Simulate AI scoring and feedback generation (NVIDIA NIM service call)
    // In a real implementation, this would call the NVIDIA NIM service
    await new Promise(resolve => setTimeout(resolve, 1500))

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

    // Update mock interview row with answers, score, feedback, and set status back to COMPLETED
    const { data: updatedMock, error: updateError } = await supabase
      .from("mock_interviews")
      .update({
        answers: answers,
        ai_score: score,
        ai_feedback: constructiveFeedback,
        status: "COMPLETED", // Now fully completed with evaluation
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Send notification to student that mock interview evaluation is complete
    // Get student user ID
    const { data: studentProfile, error: studentError } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("id", updatedMock.student_id)
      .single()

    if (!studentError && studentProfile) {
      await supabase
        .from("notifications")
        .insert({
          user_id: studentProfile.user_id,
          title: "Mock Interview Completed",
          message: `Your mock interview for "${updatedMock.job_role_context}" has been evaluated. Your score is ${updatedMock.ai_score}%.`,
          is_read: false
        })
    }

    return NextResponse.json({ mock: updatedMock })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
