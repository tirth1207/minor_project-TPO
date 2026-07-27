export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user is corporate partner
    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden: Corporate access only" }, { status: 403 })
    }

    const { data: companyProfile, error: cpError } = await supabase
      .from("company_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (cpError || !companyProfile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    // Retrieve job postings published by this company
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

    return NextResponse.json({
      jobs,
      company_status: companyProfile.status,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const role = dbUser?.role || user.app_metadata?.role
    if (role !== "COMPANY") {
      return NextResponse.json({ error: "Forbidden: Corporate access only" }, { status: 403 })
    }

    const { data: companyProfile, error: cpError } = await supabase
      .from("company_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle()

    if (cpError || !companyProfile) {
      return NextResponse.json({ error: "Company profile not found" }, { status: 404 })
    }

    if (companyProfile.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your corporate account is PENDING approval. You cannot publish job postings yet." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      location,
      workMode,
      package: ctcVal,
      minCgpa,
      maxBacklogs,
      requireMock,
      mockPassScore,
      branches,
    } = body

    if (!title || !description || !location || !ctcVal || !minCgpa || !maxBacklogs) {
      return NextResponse.json({ error: "Missing required job drive parameters" }, { status: 400 })
    }

    const parsedPackage = parseFloat(ctcVal)
    const parsedMinCgpa = parseFloat(minCgpa)
    const parsedMaxBacklogs = parseInt(maxBacklogs)
    const parsedMockPassScore = requireMock ? parseInt(mockPassScore || "50") : 50

    // Retrieve active colleges
    const { data: activeColleges } = await supabase
      .from("organizations")
      .select("id")
      .eq("status", "ACTIVE")

    // Insert drive into job_postings as PENDING
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        company_id: companyProfile.id,
        title,
        description,
        ctc_min: parsedPackage,
        ctc_max: parsedPackage,
        location,
        work_mode: workMode || "ONSITE",
        min_cgpa: parsedMinCgpa,
        max_backlogs: parsedMaxBacklogs,
        require_mock: !!requireMock,
        mock_pass_score: parsedMockPassScore,
        global_status: "PENDING", // awaits SA global approval
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 400 })
    }

    // Auto-create eligible branches
    const branchList = Array.isArray(branches) && branches.length > 0
      ? branches
      : ["Computer Science", "Information Technology", "Electronics"]

    const branchInserts = branchList.map((branch_name: string) => ({
      job_id: job.id,
      branch_name,
    }))

    const { error: branchError } = await supabase
      .from("job_eligible_branches")
      .insert(branchInserts)

    if (branchError) {
      return NextResponse.json({ error: `Job created but branches failed: ${branchError.message}` }, { status: 400 })
    }

    // Auto-create college mappings for active colleges
    if (activeColleges && activeColleges.length > 0) {
      const mappingInserts = activeColleges.map((college: any) => ({
        job_id: job.id,
        org_id: college.id,
        local_status: "PENDING", // college admin must approve locally
      }))

      await supabase.from("job_college_mappings").insert(mappingInserts)
    }

    return NextResponse.json({ job, message: "Job drive posted successfully!" }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
