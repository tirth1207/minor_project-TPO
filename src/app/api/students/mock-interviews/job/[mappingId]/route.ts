export const dynamic = "force-dynamic"

import { requireApprovedStudent } from "@/lib/auth/require-approved-student"
import { NextResponse } from "next/server"
import { generateStructuredMockInterview, normalizeSkill } from "@/lib/ai/mock-interview"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import type { MockInterviewQuestion } from "@/types/mock-interview"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mappingId: string }> }
) {
  try {
    const { mappingId } = await params
    const auth = await requireApprovedStudent()
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error, code: "UNAUTHORIZED" },
        { status: auth.status }
      )
    }

    const rateLimit = checkRateLimit(`job-mock-start:${auth.user.id}`, { windowMs: 60 * 1000, maxRequests: 5 })
    if (!rateLimit.success) {
      return rateLimitResponse()
    }

    const { supabase, studentId, orgId } = auth

    // Verify student can access mapping and job posting in their college organization
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
        { success: false, error: "Job assessment mapping not found", code: "MAPPING_NOT_FOUND" },
        { status: 404 }
      )
    }

    const job = mapping.job as any

    if (mapping.local_status !== "APPROVED" || job.global_status !== "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Job posting is not active", code: "JOB_NOT_ACTIVE" },
        { status: 400 }
      )
    }

    if (!job.require_mock) {
      return NextResponse.json(
        { success: false, error: "This job drive does not require a mandatory mock assessment.", code: "MOCK_NOT_REQUIRED" },
        { status: 400 }
      )
    }

    // Extract structured skill tags from job description
    const rawSkills = Array.isArray(job.description?.match(/\b[A-Za-z0-9#+.]+\b/g))
      ? job.description.match(/\b[A-Za-z0-9#+.]+\b/g)
      : []
    const knownTech = [
      "react", "node", "nodejs", "javascript", "typescript", "python", "java", "c++", "c#",
      "sql", "postgresql", "postgres", "mongodb", "aws", "docker", "kubernetes", "git", "express",
      "next.js", "nextjs", "html", "css", "tailwind", "dsa", "algorithms", "system design"
    ]
    const extractedSkills = Array.from(
      new Set(
        rawSkills
          .filter((w: string) => knownTech.includes(w.toLowerCase()))
          .map(normalizeSkill)
      )
    ).slice(0, 8)

    // Build job specification snapshot
    const jobSpecSnapshot = {
      jobId: job.id,
      mappingId: mapping.id,
      title: job.title,
      role: job.title,
      companyName: job.company?.company_name || "Corporate Partner",
      description: job.description,
      skills: extractedSkills.length > 0 ? extractedSkills : [job.title],
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

    let generatedQuestions: MockInterviewQuestion[] = []
    let initialStatus = "ANSWERING"

    try {
      console.log(`[MOCK_CREATE] Attempting immediate generation for student=${studentId} mapping=${mappingId}`)
      generatedQuestions = await generateStructuredMockInterview(
        "JOB_REQUIRED",
        job.title,
        jobSpecSnapshot
      )
    } catch (genErr: any) {
      console.warn(`[MOCK_CREATE_QUEUED] Direct generation failed for student=${studentId}:`, genErr?.message)
      initialStatus = "QUEUED"
    }

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
        questions: generatedQuestions,
        status: initialStatus,
      })
      .select()
      .single()

    if (error) {
      console.error("[MOCK_CREATE_ERROR]", error)
      return NextResponse.json({ success: false, error: error.message, code: "DB_INSERT_FAILED" }, { status: 400 })
    }

    return NextResponse.json(
      {
        success: true,
        mock: mockRecord,
        mapping,
        message: "Job-required mock assessment initialized successfully",
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[MOCK_CREATE_FATAL]", err)
    return NextResponse.json({ success: false, error: err?.message || "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
