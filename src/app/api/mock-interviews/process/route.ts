export const dynamic = "force-dynamic"

import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview"

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user } = auth

    const role = user.app_metadata?.role
    if (role !== "SA" && role !== "COLLEGE_ADMIN" && role !== "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: queuedInterviews, error: fetchError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("status", "QUEUED")

    if (fetchError) {
      console.error("Error fetching queued mock interviews:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const processed = []
    const errors = []

    for (const interview of queuedInterviews) {
      try {
        const { error: updateError, data: updatedInterview } = await supabase
          .from("mock_interviews")
          .update({ status: "PROCESSING" })
          .eq("id", interview.id)
          .eq("status", "QUEUED")
          .select()
          .single()

        if (updateError || !updatedInterview) {
          throw new Error("Concurrent processing detected or status update failed")
        }

        const mockType = updatedInterview.mock_type || "PRACTICE"
        const jobRole = updatedInterview.job_role_context || "Software Engineer"
        const jobInfo = updatedInterview.job_spec_snapshot

        const generatedQuestions = await generateStructuredMockInterview(
          mockType,
          jobRole,
          jobInfo
        )

        await supabase
          .from("mock_interviews")
          .update({
            questions: generatedQuestions,
            status: "ANSWERING",
          })
          .eq("id", interview.id)

        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("user_id")
          .eq("id", updatedInterview.student_id)
          .single()

        if (studentProfile) {
          await supabase.from("notifications").insert({
            user_id: studentProfile.user_id,
            title: "Mock Assessment Ready",
            message: `Your AI interview assessment for "${jobRole}" is ready. You can now begin your questions.`,
            is_read: false,
          })
        }

        processed.push(updatedInterview)
      } catch (error: any) {
        console.error(`Error processing mock interview ${interview.id}:`, error)
        errors.push({ id: interview.id, error: error.message })

        await supabase
          .from("mock_interviews")
          .update({
            status: "FAILED",
            ai_summary: `Generation failed: ${error.message}`,
          })
          .eq("id", interview.id)
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
