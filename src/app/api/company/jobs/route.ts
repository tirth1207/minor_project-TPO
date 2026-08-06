export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { requireUser } from "@/lib/auth/require-user"
import { NextResponse } from "next/server"

/* =========================================================
   GET COMPANY JOBS
========================================================= */

export async function GET() {
  try {
    const auth = await requireUser()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, user, dbUser } = auth

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden: Corporate access only" }, { status: 403 })
    }

    /* -----------------------------------------------------
       Company profile
    ----------------------------------------------------- */

    const { data: companyProfile, error: companyError } = await supabase
      .from("company_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 400 })
    }

    if (!companyProfile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
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
      .order("id", { ascending: false })

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 400 })
    }

    /* -----------------------------------------------------
       Normalize branch relation
    ----------------------------------------------------- */

    const normalizedJobs =
      jobs?.map((job: any) => ({
        ...job,
        branches:
          job.branches?.map(
            (branch: { branch_name: string }) => branch.branch_name
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
    const auth = await requireActiveCompany()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase, companyId } = auth

    /* -----------------------------------------------------
       Request
    ----------------------------------------------------- */

    const body = await request.json()

    const {
      title,
      description,
      location,
      workMode, // Match what the UI sends or handle both workMode and work_mode
      package: ctc, // UI sends 'package'
      minCgpa,
      maxBacklogs,
      requireMock,
      mockPassScore,
      branches,
    } = body

    const actualWorkMode = workMode || body.work_mode

    /* -----------------------------------------------------
       Validation
    ----------------------------------------------------- */

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 })
    }

    if (typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 })
    }

    if (typeof location !== "string" || !location.trim()) {
      return NextResponse.json({ error: "Job location is required" }, { status: 400 })
    }

    const allowedWorkModes = ["ONSITE", "HYBRID", "REMOTE"]
    if (!actualWorkMode || !allowedWorkModes.includes(actualWorkMode)) {
      return NextResponse.json({ error: "Invalid work mode" }, { status: 400 })
    }

    /* -----------------------------------------------------
       Numeric values
    ----------------------------------------------------- */

    // CTC min/max parsing
    const parsedCtc = ctc ? Number(ctc) : null
    const parsedMinCgpa = minCgpa === null || minCgpa === undefined || minCgpa === "" ? 0 : Number(minCgpa)
    const parsedMaxBacklogs = maxBacklogs === null || maxBacklogs === undefined || maxBacklogs === "" ? 0 : Number(maxBacklogs)
    const parsedMockScore = requireMock ? Number(mockPassScore ?? 50) : 50

    /* -----------------------------------------------------
       Validate numbers
    ----------------------------------------------------- */

    if (parsedCtc !== null && (!Number.isFinite(parsedCtc) || parsedCtc < 0)) {
      return NextResponse.json({ error: "Invalid CTC" }, { status: 400 })
    }

    if (!Number.isFinite(parsedMinCgpa) || parsedMinCgpa < 0 || parsedMinCgpa > 10) {
      return NextResponse.json({ error: "Minimum CGPA must be between 0 and 10" }, { status: 400 })
    }

    if (!Number.isInteger(parsedMaxBacklogs) || parsedMaxBacklogs < 0) {
      return NextResponse.json({ error: "Maximum backlogs must be a non-negative integer" }, { status: 400 })
    }

    if (requireMock && (!Number.isFinite(parsedMockScore) || parsedMockScore < 0 || parsedMockScore > 100)) {
      return NextResponse.json({ error: "Mock pass score must be between 0 and 100" }, { status: 400 })
    }

    /* -----------------------------------------------------
       Branches
    ----------------------------------------------------- */

    if (!Array.isArray(branches) || branches.length === 0) {
      return NextResponse.json({ error: "At least one eligible branch is required" }, { status: 400 })
    }

    const branchList = [
      ...new Set(
        branches
          .filter((branch): branch is string => typeof branch === "string")
          .map((branch) => branch.trim())
          .filter(Boolean)
      ),
    ]

    if (branchList.length === 0) {
      return NextResponse.json({ error: "At least one valid eligible branch is required" }, { status: 400 })
    }

    /* -----------------------------------------------------
       Active colleges
    ----------------------------------------------------- */

    const { data: activeColleges, error: collegesError } = await supabase
      .from("organizations")
      .select("id")
      .eq("status", "ACTIVE")

    if (collegesError) {
      return NextResponse.json({ error: collegesError.message }, { status: 400 })
    }

    /* -----------------------------------------------------
       Create job
    ----------------------------------------------------- */

    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        work_mode: actualWorkMode,
        ctc_min: parsedCtc,
        ctc_max: parsedCtc,
        min_cgpa: parsedMinCgpa,
        max_backlogs: parsedMaxBacklogs,
        require_mock: Boolean(requireMock),
        mock_pass_score: requireMock ? parsedMockScore : 50,
        global_status: "PENDING",
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 400 })
    }

    /* -----------------------------------------------------
       Eligible branches
    ----------------------------------------------------- */

    const branchInserts = branchList.map((branchName) => ({
      job_id: job.id,
      branch_name: branchName,
    }))

    const { error: branchError } = await supabase
      .from("job_eligible_branches")
      .insert(branchInserts)

    if (branchError) {
      await supabase.from("job_postings").delete().eq("id", job.id)
      return NextResponse.json({ error: `Failed to configure eligibility: ${branchError.message}` }, { status: 400 })
    }

    /* -----------------------------------------------------
       College mappings
    ----------------------------------------------------- */

    if (activeColleges && activeColleges.length > 0) {
      const mappings = activeColleges.map((college: any) => ({
        job_id: job.id,
        org_id: college.id,
        local_status: "PENDING",
      }))
      console.log("Creating college mappings:", mappings)
      const { error: mappingError } = await supabase
        .from("job_college_mappings")
        .insert(mappings)

      if (mappingError) {
        console.error("Failed to create college mappings:", mappingError)
      }
    }

    return NextResponse.json(
      {
        job: {
          ...job,
          branches: branchList,
        },
        message: "Job posting submitted for approval.",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("POST /api/company/jobs:", error)
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
