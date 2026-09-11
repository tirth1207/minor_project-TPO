export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireActiveCompany()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { supabase } = auth
    const body = await request.json()
    const parsedCtc = Number(body?.ctcOffered)

    if (!Number.isFinite(parsedCtc) || parsedCtc <= 0) {
      return NextResponse.json(
        { error: "ctcOffered must be a valid positive package value" },
        { status: 400 }
      )
    }

    const { data: offer, error } = await supabase.rpc("create_company_offer", {
      p_application_id: id,
      p_ctc_offered: parsedCtc,
    })

    if (error) {
      console.error("Failed to create transactional offer:", error)
      const message = error.message?.toLowerCase() ?? ""

      if (message.includes("already exists") || message.includes("duplicate")) {
        return NextResponse.json(
          { error: "An offer has already been extended for this candidate." },
          { status: 409 }
        )
      }

      if (message.includes("shortlisted")) {
        return NextResponse.json(
          { error: "An offer can only be extended to a shortlisted application." },
          { status: 409 }
        )
      }

      if (message.includes("not found") || message.includes("unauthorized")) {
        return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 })
      }

      return NextResponse.json({ error: "Failed to extend job offer" }, { status: 500 })
    }

    return NextResponse.json(
      { offer, message: "Job offer extended successfully!" },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("POST /api/company/applications/[id]/offer:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
