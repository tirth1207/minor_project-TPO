export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/* =========================================================
   GET COMPANY JOBS
========================================================= */

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* -----------------------------------------------------
       Authorize company user
    ----------------------------------------------------- */

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    const role =
      dbUser?.role ??
      user.app_metadata?.role

    if (role !== "COMPANY") {
      return NextResponse.json(
        {
          error: "Forbidden: Corporate access only",
        },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       Company profile
    ----------------------------------------------------- */

    const {
      data: companyProfile,
      error: companyError,
    } = await supabase
      .from("company_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (companyError) {
      return NextResponse.json(
        { error: companyError.message },
        { status: 400 }
      )
    }

    if (!companyProfile) {
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 }
      )
    }

    /* -----------------------------------------------------
       Jobs
    ----------------------------------------------------- */

    const { data: jobs, error: jobsError } = await supabase
      .from("job_postings")
      .select(`
        *,
        branches:job_eligible_branches(
          branch_name
        )
      `)
      .eq("company_id", companyProfile.id)
      .order("id", {
        ascending: false,
      })

    if (jobsError) {
      return NextResponse.json(
        { error: jobsError.message },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Normalize branch relation
    ----------------------------------------------------- */

    const normalizedJobs =
      jobs?.map((job: any) => ({
        ...job,

        branches:
          job.branches?.map(
            (branch: { branch_name: string }) =>
              branch.branch_name
          ) ?? [],
      })) ?? []

    return NextResponse.json({
      jobs: normalizedJobs,
      company_status: companyProfile.status,
    })
  } catch (error: unknown) {
    console.error("GET /api/company/jobs:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

/* =========================================================
   CREATE JOB
========================================================= */

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    /* -----------------------------------------------------
       Authentication
    ----------------------------------------------------- */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* -----------------------------------------------------
       Authorization
    ----------------------------------------------------- */

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      )
    }

    const role =
      dbUser?.role ??
      user.app_metadata?.role

    if (role !== "COMPANY") {
      return NextResponse.json(
        {
          error: "Forbidden: Corporate access only",
        },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       Company
    ----------------------------------------------------- */

    const {
      data: companyProfile,
      error: companyError,
    } = await supabase
      .from("company_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (companyError) {
      return NextResponse.json(
        { error: companyError.message },
        { status: 400 }
      )
    }

    if (!companyProfile) {
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 }
      )
    }

    if (companyProfile.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            "Your corporate account must be approved before you can publish job postings.",
        },
        { status: 403 }
      )
    }

    /* -----------------------------------------------------
       Request
    ----------------------------------------------------- */

    const body = await request.json()

    const {
      title,
      description,
      location,
      work_mode,

      ctc_min,
      ctc_max,

      min_cgpa,
      max_backlogs,

      require_mock,
      mock_pass_score,

      branches,
    } = body

    /* -----------------------------------------------------
       Validation
    ----------------------------------------------------- */

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      )
    }

    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      )
    }

    if (
      typeof location !== "string" ||
      !location.trim()
    ) {
      return NextResponse.json(
        { error: "Job location is required" },
        { status: 400 }
      )
    }

    const allowedWorkModes = [
      "ONSITE",
      "HYBRID",
      "REMOTE",
    ]

    if (
      !work_mode ||
      !allowedWorkModes.includes(work_mode)
    ) {
      return NextResponse.json(
        { error: "Invalid work mode" },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Numeric values
    ----------------------------------------------------- */

    const parsedCtcMin =
      ctc_min === null ||
      ctc_min === undefined ||
      ctc_min === ""
        ? null
        : Number(ctc_min)

    const parsedCtcMax =
      ctc_max === null ||
      ctc_max === undefined ||
      ctc_max === ""
        ? null
        : Number(ctc_max)

    const parsedMinCgpa =
      min_cgpa === null ||
      min_cgpa === undefined ||
      min_cgpa === ""
        ? 0
        : Number(min_cgpa)

    const parsedMaxBacklogs =
      max_backlogs === null ||
      max_backlogs === undefined ||
      max_backlogs === ""
        ? 0
        : Number(max_backlogs)

    const parsedMockScore =
      require_mock
        ? Number(mock_pass_score ?? 50)
        : 50

    /* -----------------------------------------------------
       Validate numbers
    ----------------------------------------------------- */

    if (
      parsedCtcMin !== null &&
      (!Number.isFinite(parsedCtcMin) ||
        parsedCtcMin < 0)
    ) {
      return NextResponse.json(
        { error: "Invalid minimum CTC" },
        { status: 400 }
      )
    }

    if (
      parsedCtcMax !== null &&
      (!Number.isFinite(parsedCtcMax) ||
        parsedCtcMax < 0)
    ) {
      return NextResponse.json(
        { error: "Invalid maximum CTC" },
        { status: 400 }
      )
    }

    if (
      parsedCtcMin !== null &&
      parsedCtcMax !== null &&
      parsedCtcMin > parsedCtcMax
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum CTC cannot be greater than maximum CTC",
        },
        { status: 400 }
      )
    }

    if (
      !Number.isFinite(parsedMinCgpa) ||
      parsedMinCgpa < 0 ||
      parsedMinCgpa > 10
    ) {
      return NextResponse.json(
        {
          error:
            "Minimum CGPA must be between 0 and 10",
        },
        { status: 400 }
      )
    }

    if (
      !Number.isInteger(parsedMaxBacklogs) ||
      parsedMaxBacklogs < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum backlogs must be a non-negative integer",
        },
        { status: 400 }
      )
    }

    if (
      require_mock &&
      (
        !Number.isFinite(parsedMockScore) ||
        parsedMockScore < 0 ||
        parsedMockScore > 100
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Mock pass score must be between 0 and 100",
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Branches
    ----------------------------------------------------- */

    if (
      !Array.isArray(branches) ||
      branches.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one eligible branch is required",
        },
        { status: 400 }
      )
    }

    const branchList = [
      ...new Set(
        branches
          .filter(
            (branch): branch is string =>
              typeof branch === "string"
          )
          .map((branch) => branch.trim())
          .filter(Boolean)
      ),
    ]

    if (branchList.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one valid eligible branch is required",
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Active colleges
    ----------------------------------------------------- */

    const {
      data: activeColleges,
      error: collegesError,
    } = await supabase
      .from("organizations")
      .select("id")
      .eq("status", "ACTIVE")

    if (collegesError) {
      return NextResponse.json(
        { error: collegesError.message },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Create job
    ----------------------------------------------------- */

    const { data: job, error: jobError } =
      await supabase
        .from("job_postings")
        .insert({
          company_id: companyProfile.id,

          title: title.trim(),
          description: description.trim(),
          location: location.trim(),

          work_mode,

          ctc_min: parsedCtcMin,
          ctc_max: parsedCtcMax,

          min_cgpa: parsedMinCgpa,
          max_backlogs: parsedMaxBacklogs,

          require_mock: Boolean(require_mock),

          mock_pass_score:
            require_mock
              ? parsedMockScore
              : 50,

          global_status: "PENDING",
        })
        .select()
        .single()

    if (jobError) {
      return NextResponse.json(
        { error: jobError.message },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       Eligible branches
    ----------------------------------------------------- */

    const branchInserts = branchList.map(
      (branchName) => ({
        job_id: job.id,
        branch_name: branchName,
      })
    )

    const { error: branchError } = await supabase
      .from("job_eligible_branches")
      .insert(branchInserts)

    if (branchError) {
      /*
       * Ideally this whole operation should eventually be
       * moved into a Postgres function/transaction.
       */

      await supabase
        .from("job_postings")
        .delete()
        .eq("id", job.id)

      return NextResponse.json(
        {
          error: `Failed to configure eligibility: ${branchError.message}`,
        },
        { status: 400 }
      )
    }

    /* -----------------------------------------------------
       College mappings
    ----------------------------------------------------- */

    if (
      activeColleges &&
      activeColleges.length > 0
    ) {
      const mappings = activeColleges.map(
        (college:any) => ({
          job_id: job.id,
          org_id: college.id,
          local_status: "PENDING",
        })
      )

      const { error: mappingError } =
        await supabase
          .from("job_college_mappings")
          .insert(mappings)

      if (mappingError) {
        console.error(
          "Failed to create college mappings:",
          mappingError
        )
      }
    }

    return NextResponse.json(
      {
        job: {
          ...job,
          branches: branchList,
        },

        message:
          "Job posting submitted for approval.",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error(
      "POST /api/company/jobs:",
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}