export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  try {
    const { mappingId } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: auth.error },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`mock-create-job:${auth.user.id}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId, orgId } = auth

    // Verify student can access mapping and job posting
    const { data: mapping, error: mappingError } = await supabase
      .from("job_college_mappings")
      .select(`
        id,
        job_id,
        local_status,
        job:job_postings!inner(
          id,
          title,
          description,
          require_mock,
          mock_pass_score,
          global_status,
          ctc_max,
          min_cgpa,
          max_backlogs,
          company:company_profiles(company_name),
          job_eligible_branches(branch_name)
        )
      `)
      .eq("id", mappingId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (mappingError || !mapping) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", error: "Job assessment mapping not found" },
        { status: 404 }
      )
    }

    const job = mapping.job as any

    if (mapping.local_status !== "APPROVED" || job.global_status !== "APPROVED") {
      return NextResponse.json(
        { success: false, code: "JOB_INACTIVE", error: "Job posting is not active for your institution" },
        { status: 400 }
      )
    }

    if (!job.require_mock) {
      return NextResponse.json(
        { success: false, code: "MOCK_NOT_REQUIRED", error: "This job drive does not require a mandatory mock assessment." },
        { status: 400 }
      )
    }

    // Build job specification snapshot
    const jobSpecSnapshot = {
      jobId: job.id,
      mappingId: mapping.id,
      title: job.title,
      role: job.title,
      companyName: job.company?.company_name || "Corporate Partner",
      description: job.description,
      skills: Array.isArray(job.description?.match(/[A-Z][a-zA-Z0-9#+.]+/g))
        ? Array.from(new Set(job.description.match(/[A-Z][a-zA-Z0-9#+.]+/g))).slice(0, 8)
        : [],
      ctcMax: job.ctc_max,
      minCgpa: job.min_cgpa,
      maxBacklogs: job.max_backlogs,
      mockPassScore: job.mock_pass_score || 70,
    }

    // Determine current attempt count
    const { data: existingAttempts } = await supabase
      .from("mock_interviews")
      .select("attempt_number")
      .eq("student_id", studentId)
      .eq("job_college_mapping_id", mappingId)
      .order("attempt_number", { ascending: false })

    const nextAttempt = existingAttempts && existingAttempts.length > 0
      ? (existingAttempts[0].attempt_number || 1) + 1
      : 1

    const { data: mockRecord, error } = await supabase
      .from("mock_interviews")
      .insert({
        student_id: studentId,
        job_id: job.id,
        job_college_mapping_id: mapping.id,
        mock_type: "JOB_REQUIRED",
        job_role_context: `${job.title} at ${jobSpecSnapshot.companyName}`,
        job_spec_snapshot: jobSpecSnapshot,
        attempt_number: nextAttempt,
        questions: [],
        status: "QUEUED",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          mock: mockRecord,
          mapping,
        },
        mock: mockRecord,
        mapping,
        message: "Job-required mock assessment created successfully",
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, code: "SERVER_ERROR", error: err?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
