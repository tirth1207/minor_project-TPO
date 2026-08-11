export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    // Only allow SA or COLLEGE_ADMIN to process mock interviews (internal operation)
    const role = user.app_metadata?.role
    if (role !== 'SA' && role !== 'COLLEGE_ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find all mock interviews with QUEUED status
    const { data: queuedInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("id, job_role_context, retry_count")
      .eq("status", "QUEUED")

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Process each queued interview
    const processed = []
    const errors = []

    for (const interview of queuedInterviews) {
      try {
        // Set status to PROCESSING
        await supabase
          .from("mock_interviews")
          .update({ status: "PROCESSING" })
          .eq("id", interview.id)

        // Simulate processing delay (NVIDIA NIM service call)
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Generate questions based on job role context (simulating NVIDIA NIM service)
        let generatedQuestions = []
        const normalizedRole = interview.job_role_context.toLowerCase().trim()

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
        const { data: updatedInterview, error: updateError } = await supabase
          .from("mock_interviews")
          .update({
            questions: generatedQuestions,
            status: "COMPLETED", // Questions are ready for student to answer
          })
          .eq("id", interview.id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        // Send notification to student that mock interview questions are ready
        // Get student user ID
        const { data: studentProfile, error: studentError } = await supabase
          .from("student_profiles")
          .select("user_id")
          .eq("id", updatedInterview.student_id)
          .single()

        if (!studentError && studentProfile) {
          await supabase
            .from("notifications")
            .insert({
              user_id: studentProfile.user_id,
              title: "Mock Interview Ready",
              message: `Your mock interview for "${updatedInterview.job_role_context}" is ready. You can now start answering the questions.`,
              is_read: false
            })
        }

        processed.push(updatedInterview)
      } catch (error) {
        // Set status to FAILED on error, increment retry count
        // If retry count exceeds max retries (3), keep as FAILED
        // Otherwise, set back to QUEUED for retry
        const newRetryCount = interview.retry_count + 1
        if (newRetryCount >= 3) {
          await supabase
            .from("mock_interviews")
            .update({ 
              status: "FAILED",
              retry_count: newRetryCount
            })
            .eq("id", interview.id)
          
          // Send notification of failure after max retries
          // Get student user ID
          const { data: studentProfile, error: studentError } = await supabase
            .from("student_profiles")
            .select("user_id")
            .eq("id", interview.student_id)
            .single()

          if (!studentError && studentProfile) {
            await supabase
              .from("notifications")
              .insert({
                user_id: studentProfile.user_id,
                title: "Mock Interview Processing Failed",
                message: `Your mock interview for "${interview.job_role_context}" failed to process after ${newRetryCount} attempts. Please try creating a new mock interview.`,
                is_read: false
              })
          }
        } else {
          await supabase
            .from("mock_interviews")
            .update({ 
              status: "QUEUED", // Reset to QUEUED for retry
              retry_count: newRetryCount
            })
            .eq("id", interview.id)
        }

        errors.push({ id: interview.id, error: error.message })
      }
    }

    return NextResponse.json({
      processed,
      errors,
      count: processed.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}