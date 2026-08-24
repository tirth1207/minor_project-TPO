"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  IconBriefcase,
  IconClock,
  IconHelpCircle,
  IconCheck,
  IconArrowLeft,
  IconSparkles,
  IconAlertTriangle,
} from "@tabler/icons-react"

export default function StudentJobMockStartPage() {
  const params = useParams()
  const router = useRouter()
  const mappingId = params.mappingId as string

  const [jobData, setJobData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [creatingMock, setCreatingMock] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadJobDetails() {
      try {
        const res = await fetch(`/api/students/jobs`)
        if (res.ok) {
          const data = await res.json()
          const matched = (data.jobs || []).find(
            (j: any) => j.mapping?.id === mappingId || j.job?.id === mappingId
          )
          if (matched) {
            setJobData(matched)
          } else {
            setError("Job details not found for this mapping.")
          }
        } else {
          setError("Failed to fetch job details.")
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load job details")
      } finally {
        setLoading(false)
      }
    }

    if (mappingId) loadJobDetails()
  }, [mappingId])

  const handleStartJobAssessment = async () => {
    setCreatingMock(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/mock-interviews/job/${mappingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json()
      if (res.ok && data.mock?.id) {
        router.push(`/student/mock/${data.mock.id}`)
      } else {
        setError(data.error || "Failed to initialize job mock interview assessment.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
    } finally {
      setCreatingMock(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-xs text-zinc-500">Loading AI Job Assessment Details...</p>
      </div>
    )
  }

  const job = jobData?.job
  const companyName = job?.company?.company_name || "Corporate Partner"
  const passingScore = job?.mock_pass_score || 70

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Link href="/student/jobs">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-zinc-500">
          <IconArrowLeft className="h-3.5 w-3.5" />
          Back to Campus Placements
        </Button>
      </Link>

      <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader className="space-y-3 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-[10px]">
              <IconSparkles className="h-3 w-3 text-amber-500" />
              Job Application Gate Assessment
            </Badge>

            <Badge variant="secondary" className="text-xs font-semibold">
              Passing Threshold: {passingScore}%
            </Badge>
          </div>

          <div>
            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {job?.title || "Software Engineering Assessment"}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 mt-1">
              Company: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{companyName}</span>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconHelpCircle className="mx-auto h-4 w-4 text-primary mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">8–10 Questions</div>
              <div className="text-[10px] text-zinc-400">MCQ, Theory & Coding</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconClock className="mx-auto h-4 w-4 text-primary mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">20 Minutes</div>
              <div className="text-[10px] text-zinc-400">Estimated Duration</div>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
              <IconBriefcase className="mx-auto h-4 w-4 text-primary mb-1" />
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{job?.ctc_max ? `₹${job.ctc_max} LPA` : "Standard Drive"}</div>
              <div className="text-[10px] text-zinc-400">Job Package</div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Assessment Rules & Guidelines</h4>
            <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <IconCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                This assessment is generated dynamically based on this job&apos;s exact role, description, and technical stack requirements.
              </li>
              <li className="flex items-center gap-2">
                <IconCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                You must achieve an overall score of at least <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{passingScore}%</strong> to unlock job application submission.
              </li>
              <li className="flex items-center gap-2">
                <IconCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Once started, the test parameters remain locked to this specific job posting.
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleStartJobAssessment}
              disabled={creatingMock}
              className="w-full h-10 text-xs font-semibold gap-2"
            >
              <IconSparkles className="h-4 w-4" />
              {creatingMock ? "Generating Job Assessment..." : "Start Job Assessment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
