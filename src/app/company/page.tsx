"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AnalyticsBars, AnalyticsDonut } from "@/components/dashboard-analytics"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IconPlus } from "@tabler/icons-react"
import { useCompany } from "./company-context"

export default function CompanyRootPage() {
  const router = useRouter()
  const { jobs, allApplicants } = useCompany()

  const total = allApplicants.length
  const shortlisted = allApplicants.filter(
    (applicant) => applicant.status === "SHORTLISTED"
  ).length
  const offered = allApplicants.filter(
    (applicant) => applicant.status === "OFFERED"
  ).length
  const active = jobs.filter(
    (job) => job.global_status === "APPROVED"
  ).length

  const statuses = [
    "APPLIED",
    "SHORTLISTED",
    "OFFERED",
    "REJECTED",
    "WITHDRAWN",
  ].map((label) => ({
    label,
    value: allApplicants.filter((applicant) => applicant.status === label)
      .length,
  }))

  const performance = jobs
    .map((job) => ({
      label: job.title,
      value: allApplicants.filter(
        (applicant) => applicant.job_college_mapping?.job?.id === job.id
      ).length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const shortlistRate = total
    ? Math.round((shortlisted / total) * 100)
    : 0
  const offerRate = total
    ? Math.round((offered / total) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Company Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live recruitment performance from your company data.
          </p>
        </div>

        <Button onClick={() => router.push("/company/post-job")}>
          <IconPlus className="size-4" />
          Post opening
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Openings", jobs.length],
          ["Active openings", active],
          ["Applicants", total],
          ["Offers", offered],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="mt-6">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold">
                {value as number}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsDonut
          title="Recruitment funnel"
          description="Current candidate distribution by application status."
          data={statuses}
        />
        <AnalyticsBars
          title="Opening performance"
          description="Applicant volume per opening."
          data={performance}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsBars
          title="Pipeline milestones"
          data={[
            {
              label: "Applied",
              value: allApplicants.filter(
                (applicant) => applicant.status === "APPLIED"
              ).length,
            },
            {
              label: "Shortlisted",
              value: shortlisted,
            },
            {
              label: "Offered",
              value: offered,
            },
            {
              label: "Rejected",
              value: allApplicants.filter(
                (applicant) => applicant.status === "REJECTED"
              ).length,
            },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion snapshot</CardTitle>
            <CardDescription>
              Calculated from the current applicant set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Shortlist rate</span>
              <b>{shortlistRate}%</b>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${shortlistRate}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span>Offer rate</span>
              <b>{offerRate}%</b>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${offerRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
