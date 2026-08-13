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

    // Process any REQUESTED or QUEUED mock interviews for this student
    // Set REQUESTED to QUEUED
    await supabase
      .from("mock_interviews")
      .update({ status: "QUEUED" })
      .eq("student_id", student.id)
      .eq("status", "REQUESTED")

    // Process QUEUED interviews (generate questions)
    const { data: queuedInterviews, error: fetchQueuedError } = await supabase
      .from("mock_interviews")
      .select("id, job_role_context, retry_count")
      .eq("student_id", student.id)
      .eq("status", "QUEUED")

    if (!fetchQueuedError && queuedInterviews) {
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
          await supabase
            .from("mock_interviews")
            .update({
              questions: generatedQuestions,
              status: "COMPLETED", // Questions are ready for student to answer
            })
            .eq("id", interview.id)

          // Send notification to student that mock interview questions are ready
          await supabase
            .from("notifications")
            .insert({
              user_id: student.id,
              title: "Mock Interview Ready",
              message: `Your mock interview for "${interview.job_role_context}" is ready. You can now start answering the questions.`,
              is_read: false
            })
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
            await supabase
              .from("notifications")
              .insert({
                user_id: student.id,
                title: "Mock Interview Processing Failed",
                message: `Your mock interview for "${interview.job_role_context}" failed to process after ${newRetryCount} attempts. Please try creating a new mock interview.`,
                is_read: false
              })
          } else {
            await supabase
              .from("mock_interviews")
              .update({ 
                status: "QUEUED", // Reset to QUEUED for retry
                retry_count: newRetryCount
              })
              .eq("id", interview.id)
          }
        }
      }
    }

    const { data: mockInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("student_id", student.id)
      .order("id", { ascending: false })

    if (fetchError) {
      console.error("Error fetching mock interviews after processing:", fetchError)
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
      console.error("Invalid jobRoleContext:", jobRoleContext)
      return NextResponse.json({ error: "jobRoleContext is required" }, { status: 400 })
    }

    const { data: mockInterview, error: insertError } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        job_role_context: jobRoleContext,
        questions: [], // Questions will be generated during processing
        answers: [],
        // status will default to REQUESTED
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting new mock interview:", insertError)
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
