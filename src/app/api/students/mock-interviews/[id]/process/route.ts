export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { requireApprovedStudent } from "@/lib/auth/require-approved-student";
import { generateStructuredMockInterview } from "@/lib/ai/mock-interview";
import {
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    /* ---------------------------------------------------------------------- */
    /* PARAMS                                                                 */
    /* ---------------------------------------------------------------------- */

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ID",
          error: "Mock interview ID is required",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* AUTH                                                                    */
    /* ---------------------------------------------------------------------- */

    const auth =
      await requireApprovedStudent();

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    const {
      supabase,
      studentId,
    } = auth;

    /* ---------------------------------------------------------------------- */
    /* RATE LIMIT                                                              */
    /* ---------------------------------------------------------------------- */

    const rateLimit = checkRateLimit(
      `mock-process:${auth.user.id}`,
      {
        windowMs: 60 * 1000,
        maxRequests: 10,
      }
    );

    if (!rateLimit.success) {
      return rateLimitResponse();
    }

    /* ---------------------------------------------------------------------- */
    /* FETCH MOCK                                                              */
    /* ---------------------------------------------------------------------- */

    const {
      data: mock,
      error: fetchError,
    } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("id", id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "[Mock Process] Fetch error:",
        fetchError
      );

      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_ERROR",
          error:
            "Failed to fetch mock interview session",
        },
        { status: 500 }
      );
    }

    if (!mock) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_FOUND",
          error:
            "Mock interview session not found",
        },
        { status: 404 }
      );
    }

    console.log(
      `[Mock Process] Request received | Mock: ${id} | Status: ${mock.status}`
    );

    /* ---------------------------------------------------------------------- */
    /* ALREADY COMPLETED                                                       */
    /* ---------------------------------------------------------------------- */

    if (
      mock.status === "ANSWERING" ||
      mock.status === "EVALUATED"
    ) {
      return NextResponse.json({
        success: true,
        data: {
          mock,
          alreadyProcessed: true,
        },
      });
    }

    /* ---------------------------------------------------------------------- */
    /* PROCESSING CHECK                                                        */
    /* ---------------------------------------------------------------------- */

    /**
     * If another request is currently generating the interview,
     * do not start another NVIDIA request.
     */
    if (mock.status === "PROCESSING") {
      const updatedAt =
        mock.updated_at
          ? new Date(
              mock.updated_at
            ).getTime()
          : 0;

      const stale =
        !updatedAt ||
        Date.now() - updatedAt >
          2 * 60 * 1000;

      if (!stale) {
        return NextResponse.json({
          success: true,
          data: {
            mock,
            inProgress: true,
          },
          message:
            "Interview generation is already in progress",
        });
      }

      console.warn(
        `[Mock Process] Existing PROCESSING lock is stale. Reclaiming | Mock: ${id}`
      );
    }

    /* ---------------------------------------------------------------------- */
    /* ACQUIRE PROCESSING LOCK                                                 */
    /* ---------------------------------------------------------------------- */

    const now =
      new Date().toISOString();

    const staleThreshold =
      new Date(
        Date.now() -
          2 * 60 * 1000
      ).toISOString();

    /**
     * Only one request should be able to transition
     * the mock interview into PROCESSING.
     */
    const {
      data: lockedMock,
      error: lockError,
    } = await supabase
      .from("mock_interviews")
      .update({
        status: "PROCESSING",
        updated_at: now,
      })
      .eq("id", id)
      .eq("student_id", studentId)
      .or(
        [
          "status.in.(QUEUED,REQUESTED,FAILED)",
          `and(status.eq.PROCESSING,updated_at.lt.${staleThreshold})`,
        ].join(",")
      )
      .select("*")
      .maybeSingle();

    if (lockError) {
      console.error(
        "[Mock Process] Lock error:",
        lockError
      );

      return NextResponse.json(
        {
          success: false,
          code: "LOCK_ERROR",
          error:
            "Failed to start interview processing",
        },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LOCK WAS NOT ACQUIRED                                                   */
    /* ---------------------------------------------------------------------- */

    if (!lockedMock) {
      /**
       * Another request probably acquired the lock
       * between our initial SELECT and UPDATE.
       */
      const {
        data: latestMock,
        error: latestError,
      } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("id", id)
        .eq("student_id", studentId)
        .maybeSingle();

      if (latestError) {
        console.error(
          "[Mock Process] Latest state fetch error:",
          latestError
        );

        return NextResponse.json(
          {
            success: false,
            code: "DATABASE_ERROR",
            error:
              "Failed to fetch current interview state",
          },
          { status: 500 }
        );
      }

      if (
        latestMock?.status ===
          "ANSWERING" ||
        latestMock?.status ===
          "EVALUATED"
      ) {
        return NextResponse.json({
          success: true,
          data: {
            mock: latestMock,
            alreadyProcessed: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          mock:
            latestMock || mock,
          inProgress: true,
        },
        message:
          "Interview generation is already in progress",
      });
    }

    /* ---------------------------------------------------------------------- */
    /* WE OWN THE LOCK                                                        */
    /* ---------------------------------------------------------------------- */

    const activeMock =
      lockedMock;

    console.log(
      `[Mock Process] Processing started | Mock: ${id} | Type: ${activeMock.mock_type}`
    );

    /* ---------------------------------------------------------------------- */
    /* CAREER PROFILE                                                          */
    /* ---------------------------------------------------------------------- */

    let careerProfile:
      | Record<string, unknown>
      | null = null;

    if (
      activeMock.mock_type !==
      "JOB_REQUIRED"
    ) {
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from(
          "student_career_profiles"
        )
        .select("*")
        .eq(
          "student_id",
          studentId
        )
        .maybeSingle();

      if (profileError) {
        console.warn(
          "[Mock Process] Career profile error:",
          profileError
        );
      }

      careerProfile =
        profile || null;
    }

    /* ---------------------------------------------------------------------- */
    /* AI GENERATION                                                           */
    /* ---------------------------------------------------------------------- */

    try {
      let generatedQuestions: any[];

      if (
        activeMock.mock_type ===
        "JOB_REQUIRED"
      ) {
        generatedQuestions =
          await generateStructuredMockInterview(
            "JOB_REQUIRED",
            activeMock.job_role_context ||
              "Job Candidate",
            activeMock.job_spec_snapshot
          );
      } else {
        generatedQuestions =
          await generateStructuredMockInterview(
            "PRACTICE",
            activeMock.job_role_context ||
              "Full Stack Developer",
            null,
            careerProfile
          );
      }

      /* -------------------------------------------------------------------- */
      /* VALIDATE AI RESULT                                                    */
      /* -------------------------------------------------------------------- */

      if (
        !Array.isArray(
          generatedQuestions
        )
      ) {
        throw new Error(
          "AI returned an invalid question list"
        );
      }

      if (
        generatedQuestions.length < 3
      ) {
        throw new Error(
          `AI generated only ${generatedQuestions.length} valid questions. Minimum 3 required.`
        );
      }

      console.log(
        `[Mock Process] Generated ${generatedQuestions.length} questions | Mock: ${id}`
      );

      /* -------------------------------------------------------------------- */
      /* SAVE QUESTIONS                                                        */
      /* -------------------------------------------------------------------- */

      const {
        data: updatedMock,
        error: updateError,
      } = await supabase
        .from("mock_interviews")
        .update({
          status: "ANSWERING",
          questions:
            generatedQuestions,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "status",
          "PROCESSING"
        )
        .select("*")
        .single();

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }

      console.log(
        `[Mock Process] Successfully completed | Mock: ${id}`
      );

      /* -------------------------------------------------------------------- */
      /* SUCCESS                                                               */
      /* -------------------------------------------------------------------- */

      return NextResponse.json({
        success: true,
        data: {
          mock: updatedMock,
        },
        message:
          "Interview questions generated successfully",
      });
    } catch (generationError: unknown) {
      const errorMessage =
        generationError instanceof
        Error
          ? generationError.message
          : "Failed to generate interview questions";

      console.error(
        "[Mock Process] Generation error:",
        generationError
      );

      /* -------------------------------------------------------------------- */
      /* MARK FAILED                                                           */
      /* -------------------------------------------------------------------- */

      const {
        data: failedMock,
        error: failedUpdateError,
      } = await supabase
        .from("mock_interviews")
        .update({
          status: "FAILED",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "student_id",
          studentId
        )
        .eq(
          "status",
          "PROCESSING"
        )
        .select("*")
        .maybeSingle();

      if (failedUpdateError) {
        console.error(
          "[Mock Process] Failed to update FAILED status:",
          failedUpdateError
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "GENERATION_FAILED",
          error: errorMessage,
          data: {
            mock:
              failedMock ||
              activeMock,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal server error";

    console.error(
      "[Mock Process] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

