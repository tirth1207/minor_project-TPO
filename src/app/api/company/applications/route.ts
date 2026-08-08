
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

        // Fetch only applications belonging to this company.
        // The company ownership is enforced directly by the database query.
        const { data: applications, error } = await supabase
            .from("applications")
            .select(`
            id,
                status,
                applied_at,
                mock_score,

                job_college_mapping: job_college_mappings!inner(
                    id,
                    job: job_postings!inner(
                        id,
                        title,
                        company_id
                    )
                ),

                    student: student_profiles(
                        id,
                        name,
                        enrollment_no,
                        branch,
                        cgpa,
                        active_backlogs,
                        resume_url
                    )
            `)
            .eq(
                "job_college_mapping.job.company_id",
                companyId
            )
            .order("applied_at", {
                ascending: false,
            })

        if (error) {
            console.error(
                "[COMPANY APPLICATIONS]",
                error
            )

            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            applicants: applications ?? [],
        })
    } catch (error: unknown) {
        console.error(
            "[COMPANY APPLICATIONS]",
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

