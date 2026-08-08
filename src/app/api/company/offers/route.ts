export const dynamic = "force-dynamic"

import { requireActiveCompany } from "@/lib/auth/require-active-company"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const auth = await requireActiveCompany()

        if (!auth.ok) {
            return NextResponse.json(
                { error: auth.error },
                { status: auth.status }
            )
        }

        const { supabase, companyId } = auth

        /*
         * offers
         *   ↓ application_id
         * applications
         *   ↓ job_college_map_id
         * job_college_mappings
         *   ↓ job_id
         * job_postings
         *   ↓ company_id
         * company
         */

        const { data: offers, error } = await supabase
            .from("offers")
            .select(`
        id,
        ctc_offered,
        status,
        extended_at,
        decided_at,

        application:applications!inner(
          id,
          status,
          applied_at,
          mock_score,

          job_college_mapping:job_college_mappings!inner(
            id,

            job:job_postings!inner(
              id,
              title,
              company_id
            )
          ),

          student:student_profiles(
            id,
            name,
            enrollment_no,
            branch,
            cgpa,
            active_backlogs,
            resume_url
          )
        )
      `)
            .eq(
                "application.job_college_mapping.job.company_id",
                companyId
            )
            .order("extended_at", {
                ascending: false,
            })

        if (error) {
            console.error("[COMPANY OFFERS API]", error)

            return NextResponse.json(
                {
                    error: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                },
                { status: 400 }
            )
        }

        /*
         * Convert:
         *
         * {
         *   id: offer_id,
         *   ctc_offered: 7,
         *   status: "EXTENDED",
         *   application: {...}
         * }
         *
         * into the Applicant shape expected by the frontend.
         */

        const applicants = (offers ?? [])
            .filter((offer: any) => offer.application)
            .map((offer: any) => {
                const application = offer.application

                return {
                    id: application.id,
                    status: application.status,
                    applied_at: application.applied_at,
                    mock_score: application.mock_score,

                    job_college_mapping:
                        application.job_college_mapping,

                    student: application.student,

                    offer: {
                        id: offer.id,
                        ctc_offered: offer.ctc_offered,
                        status: offer.status,
                        extended_at: offer.extended_at,
                        decided_at: offer.decided_at,
                    },
                }
            })

        return NextResponse.json({
            applicants,
            count: applicants.length,
        })
    } catch (error: unknown) {
        console.error("[COMPANY OFFERS API]", error)

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