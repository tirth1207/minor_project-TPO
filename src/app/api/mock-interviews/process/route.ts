export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"
import { generateMockInterview } from "@/lib/ai/mock-interview"
import { callNvidiaChat } from "@/lib/ai/nvidia"

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000
const MAX_DELAY_MS = 30000

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    // Only allow SA, COLLEGE_ADMIN, or STUDENT to process mock interviews (internal operation)
    const role = user.app_metadata?.role
    if (role !== "SA" && role !== "COLLEGE_ADMIN" && role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find all mock interviews with QUEUED status
    const { data: queuedInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("id, student_id, job_role_context, retry_count, status")
      .eq("status", "QUEUED")

    if (fetchError) {
      console.error("Error fetching queued mock interviews:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Process each queued interview
    const processed = []
    const errors = []

    for (const interview of queuedInterviews) {
      try {
        // Atomic status transition: QUEUED → PROCESSING
        // Use a single query to transition and verify the update succeeded
        const { error: updateError, data: updatedInterview } = await supabase
          .from("mock_interviews")
          .update({ status: "PROCESSING" })
          .eq("id", interview.id)
          .eq("status", "QUEUED") // Ensure we only transition from QUEUED
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to transition to PROCESSING: ${updateError.message}`)
        }

        // Verify the transition succeeded (status is now PROCESSING)
        if (!updatedInterview || updatedInterview.status !== "PROCESSING") {
          throw new Error("Concurrent processing detected - interview no longer in QUEUED state")
        }

        // Call NVIDIA NIM to generate questions with retry
        let generatedQuestions: any[] = []
        let lastError: any = null

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            generatedQuestions = await generateMockInterview(
              updatedInterview.job_role_context
            )
            // Success - break out of retry loop
            break
          } catch (generateError: any) {
            lastError = generateError
            console.error(
              `[MOCK] NVIDIA generation attempt ${attempt}/${MAX_RETRIES} failed:`,
              generateError.message
            )

            if (attempt >= MAX_RETRIES) {
              // Max retries reached - mark as FAILED
              await supabase
                .from("mock_interviews")
                .update({
                  status: "FAILED",
                  retry_count: (interview.retry_count ?? 0) + MAX_RETRIES,
                })
                .eq("id", interview.id)

              // Send notification of failure
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
                    title: "Mock Interview Processing Failed",
                    message: `Your mock interview for "${updatedInterview.job_role_context}" failed to process after ${MAX_RETRIES} attempts. Please try creating a new mock interview.`,
                    is_read: false,
                  })
              }

              errors.push({
                id: interview.id,
                error: lastError.message,
              })
              continue // continue to next interview
            }

            // Wait with exponential backoff before retry
            const backoffMs = Math.min(
              BASE_DELAY_MS * 2 ** (attempt - 1),
              MAX_DELAY_MS
            )
            await new Promise((resolve) => setTimeout(resolve, backoffMs))
          }
        }

        // If we got here and generatedQuestions is still undefined, all retries failed
        if (
          !generatedQuestions ||
          !Array.isArray(generatedQuestions)
        ) {
          throw new Error(
            `AI question generation failed after ${MAX_RETRIES} retries: ${
              lastError?.message || "unknown error"
            }`
          )
        }

        // Validate generated questions minimum count
        if (generatedQuestions.length < 3) {
          throw new Error(
            `AI returned insufficient questions (expected at least 3, got ${generatedQuestions.length})`
          )
        }

        // Validate each question has required fields
        for (const q of generatedQuestions) {
          if (
            !q.id ||
            !q.prompt ||
            !q.rubric ||
            !q.type
          ) {
            throw new Error(
              `Invalid question format from AI - each question must have id, prompt, rubric, and type`
            )
          }
        }

        // Save generated questions and transition to ANSWERING
        await supabase
          .from("mock_interviews")
          .update({
            questions: generatedQuestions,
            status: "ANSWERING", // Student can now start answering
          })
          .eq("id", interview.id)

        // Send notification to student that mock interview questions are ready
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
              is_read: false,
            })
        }

        processed.push(updatedInterview)
      } catch (error) {
        console.error(
          `Error processing mock interview ${interview.id}:`,
          error
        )
        errors.push({ id: interview.id, error: (error as Error).message })

        // Ensure we don't leave the interview stuck in PROCESSING
        // If the error happened after the status transition, we need to handle it
        try {
          // Try to reset if still PROCESSING
          const { data: stillProcessing } = await supabase
            .from("mock_interviews")
            .select("status")
            .eq("id", interview.id)
            .single()

          if (stillProcessing?.status === "PROCESSING") {
            await supabase
              .from("mock_interviews")
              .update({
                status: "QUEUED",
                retry_count: (interview.retry_count ?? 0) + 1,
              })
              .eq("id", interview.id)
          }
        } catch (resetError) {
          console.error(
            `Failed to reset stuck interview ${interview.id}:`,
            resetError
          )
        }
      }
    }

    return NextResponse.json({
      processed,
      errors,
      count: processed.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}