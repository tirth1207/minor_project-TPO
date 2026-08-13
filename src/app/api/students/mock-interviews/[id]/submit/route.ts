export const dynamic = "force-dynamic";

import { requireApprovedStudent } from "@/lib/auth/require-approved-student";
import { NextResponse } from "next/server";
import { evaluateMockInterview } from "@/lib/ai/mock-interview-evaluator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --------------------------------------------------
    // 1. Get interview ID
    // --------------------------------------------------

    const { id } = await params;

    // --------------------------------------------------
    // 2. Authenticate student
    // --------------------------------------------------

    const auth = await requireApprovedStudent();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { supabase, studentId } = auth;

    // --------------------------------------------------
    // 3. Parse request body
    // --------------------------------------------------

    const body = await request.json();
    const { answers } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Answers array is required" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 4. Fetch interview
    // --------------------------------------------------

    console.log("[Mock Submit] Fetching interview:", id);

    const { data: mock, error: mockError } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (mockError) {
      console.error(
        "[Mock Submit] Failed to fetch interview:",
        mockError
      );

      return NextResponse.json(
        { error: mockError.message },
        { status: 500 }
      );
    }

    if (!mock) {
      return NextResponse.json(
        { error: "Mock interview not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5. Verify interview is ready
    // --------------------------------------------------

    if (mock.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: `Interview not ready for evaluation. Current status: ${mock.status}`,
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 6. Prepare questions and answers
    // --------------------------------------------------

    const questions = Array.isArray(mock.questions)
      ? mock.questions
      : [];

    const formattedAnswers = answers.map((answer: any) => ({
      questionId: answer.questionId ?? answer.id,
      answer: answer.answer ?? "",
      language: answer.language ?? null,
    }));

    console.log("[Mock Submit] Questions:", questions.length);
    console.log("[Mock Submit] Answers:", formattedAnswers.length);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Mock interview has no questions" },
        { status: 400 }
      );
    }

    if (formattedAnswers.length !== questions.length) {
      return NextResponse.json(
        {
          error: "Number of answers does not match number of questions",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. Mark as EVALUATING
    // --------------------------------------------------

    console.log("[Mock Submit] Setting status to EVALUATING");

    const { error: evaluatingError } = await supabase
      .from("mock_interviews")
      .update({
        status: "EVALUATING",
      })
      .eq("id", id)
      .eq("student_id", studentId);

    if (evaluatingError) {
      throw new Error(
        `Failed to start evaluation: ${evaluatingError.message}`
      );
    }

    // --------------------------------------------------
    // 8. Send to NVIDIA
    // --------------------------------------------------

    let report;

    try {
      console.log("[Mock Submit] Starting AI evaluation...");

      const start = Date.now();

      report = await evaluateMockInterview(
        questions,
        formattedAnswers,
        {
          jobRole: mock.job_role_context,
        }
      );

      console.log(
        `[Mock Submit] AI evaluation completed in ${
          Date.now() - start
        }ms`
      );

      console.log(
        "[Mock Submit] Overall score:",
        report.overallScore
      );

      console.log(
        "[Mock Submit] Results:",
        report.results?.length
      );
    } catch (error: any) {
      console.error(
        "[Mock Submit] AI evaluation failed:",
        error
      );

      // Allow the student to retry.
      await supabase
        .from("mock_interviews")
        .update({
          status: "COMPLETED",
        })
        .eq("id", id)
        .eq("student_id", studentId);

      return NextResponse.json(
        {
          error:
            error?.message ||
            "AI evaluation failed",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 9. Save evaluation
    // --------------------------------------------------

    console.log("[Mock Submit] Saving evaluation...");

    const { data: updatedMock, error: updateError } =
      await supabase
        .from("mock_interviews")
        .update({
          answers: formattedAnswers,
          overall_score: report.overallScore,
          ai_summary: report.summary,
          ai_results: report.results,
          completed_at: new Date().toISOString(),
          status: "EVALUATED",
        })
        .eq("id", id)
        .eq("student_id", studentId)
        .select()
        .single();

    if (updateError) {
      console.error(
        "[Mock Submit] Failed to save evaluation:",
        updateError
      );

      // Don't leave it stuck in EVALUATING.
      await supabase
        .from("mock_interviews")
        .update({
          status: "COMPLETED",
        })
        .eq("id", id)
        .eq("student_id", studentId);

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 10. Notify student
    // --------------------------------------------------

    console.log("[Mock Submit] Creating notification...");

    const { data: studentProfile, error: studentError } =
      await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("id", updatedMock.student_id)
        .single();

    if (!studentError && studentProfile) {
      const { error: notificationError } =
        await supabase.from("notifications").insert({
          user_id: studentProfile.user_id,
          title: "Mock Interview Completed",
          message: "...",
          is_read: false,
        });

      if (notificationError) {
        console.error(
          "[Mock Submit] Notification failed:",
          notificationError
        );
      }
    }

    // --------------------------------------------------
    // 11. Return result
    // --------------------------------------------------

    console.log(
      "[Mock Submit] Successfully completed:",
      updatedMock.id
    );

    return NextResponse.json({
      mock: updatedMock,
    });
  } catch (err: any) {
    console.error(
      "[Mock Submit] Unexpected error:",
      err
    );

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error",
      },
      { status: 500 }
    );
  }
}