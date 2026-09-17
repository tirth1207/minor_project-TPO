export const dynamic = "force-dynamic"

import { requireSuperAdmin } from "@/lib/auth/require-super-admin"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { global_status } = body

    const allowedStatuses = ["APPROVED", "REJECTED", "PENDING"]
    if (!global_status || !allowedStatuses.includes(global_status)) {
      return NextResponse.json(
        { error: "global_status must be APPROVED, REJECTED, or PENDING" },
        { status: 400 }
      )
    }

    const { data: updatedJob, error } = await supabase
      .from("job_postings")
      .update({ global_status })
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("Super Admin update job status error:", error)
      return NextResponse.json({ error: "Unable to update job global status" }, { status: 500 })
    }

    if (!updatedJob) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, job: updatedJob })
  } catch (error: unknown) {
    console.error("PATCH /api/super-admin/jobs/[id] error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred updating job global status" },
      { status: 500 }
    )
  }
}
