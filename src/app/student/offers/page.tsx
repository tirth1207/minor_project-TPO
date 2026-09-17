"use client"

import * as React from "react"
import {
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconLoader,
  IconMapPin,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type OfferItem = {
  id: string
  ctc_offered: number
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "REVOKED" | "EXTENDED"
  extended_at: string
  decided_at: string | null
  application: {
    id: string
    status: string
    applied_at: string
    job_college_mapping: {
      id: string
      job: {
        id: string
        title: string
        description: string | null
        ctc_min: number
        ctc_max: number
        location: string
        work_mode: string | null
        company: {
          id: string
          company_name: string
          website: string | null
        }
      }
    }
  }
}

export default function StudentOffersPage() {
  const [offers, setOffers] = React.useState<OfferItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null)

  const [selectedOffer, setSelectedOffer] = React.useState<OfferItem | null>(null)
  const [decisionType, setDecisionType] = React.useState<"ACCEPTED" | "REJECTED" | null>(null)
  const [confirming, setConfirming] = React.useState(false)

  const fetchOffers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/students/offers")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch offers")
      }
      setOffers(data.offers || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const handleOpenDecisionDialog = (offer: OfferItem, decision: "ACCEPTED" | "REJECTED") => {
    setSelectedOffer(offer)
    setDecisionType(decision)
  }

  const handleCloseDialog = () => {
    setSelectedOffer(null)
    setDecisionType(null)
  }

  const handleConfirmDecision = async () => {
    if (!selectedOffer || !decisionType) return

    setConfirming(true)
    setError(null)
    setActionSuccess(null)

    try {
      const res = await fetch(`/api/students/offers/${selectedOffer.id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decisionType }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${decisionType.toLowerCase()} offer`)
      }

      setActionSuccess(data.message || `Offer ${decisionType.toLowerCase()} successfully!`)
      handleCloseDialog()
      await fetchOffers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process decision")
    } finally {
      setConfirming(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            <IconCheck className="mr-1 size-3.5" />
            Accepted
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <IconX className="mr-1 size-3.5" />
            Rejected
          </Badge>
        )
      case "REVOKED":
        return (
          <Badge variant="secondary" className="opacity-70">
            Revoked
          </Badge>
        )
      case "PENDING":
      case "EXTENDED":
      default:
        return (
          <Badge className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
            <IconClock className="mr-1 size-3.5" />
            Pending Response
          </Badge>
        )
    }
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Job Offers & Placement Proposals
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Review official placement offers extended by corporate partners and confirm your decision.
        </p>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400">
          <IconCheck className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{actionSuccess}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
          <IconAlertCircle className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
          <IconLoader className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            Loading job offers...
          </span>
        </div>
      ) : offers.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center py-12 text-center">
            <IconBriefcase className="mb-3 size-10 text-muted-foreground opacity-50" />
            <h3 className="text-base font-semibold">No Offers Extended Yet</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              When corporate partners complete evaluation and extend job offers, they will appear here for your review and response.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {offers.map((offer) => {
            const job = offer.application?.job_college_mapping?.job
            const company = job?.company
            const isPending = offer.status === "PENDING" || offer.status === "EXTENDED"

            return (
              <Card key={offer.id} className="flex flex-col justify-between rounded-2xl border bg-card">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40 font-bold text-foreground">
                        <IconBuilding className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base font-semibold">
                          {job?.title || "Job Position"}
                        </CardTitle>
                        <CardDescription className="truncate text-xs font-medium text-foreground/80">
                          {company?.company_name || "Company"}
                        </CardDescription>
                      </div>
                    </div>
                    <div>{getStatusBadge(offer.status)}</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3">
                    <div>
                      <span className="text-muted-foreground font-medium">Offered CTC</span>
                      <p className="mt-0.5 text-base font-bold text-primary">
                        ₹{offer.ctc_offered} LPA
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium">Location</span>
                      <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                        <IconMapPin className="size-3.5 text-muted-foreground" />
                        {job?.location || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <IconCalendar className="size-3.5" />
                        Extended Date:
                      </span>
                      <span className="font-medium text-foreground">
                        {formatDate(offer.extended_at)}
                      </span>
                    </div>

                    {offer.decided_at && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <IconClock className="size-3.5" />
                          Decision Date:
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDate(offer.decided_at)}
                        </span>
                      </div>
                    )}

                    {job?.work_mode && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <IconBriefcase className="size-3.5" />
                          Work Mode:
                        </span>
                        <span className="font-medium text-foreground capitalize">
                          {job.work_mode}
                        </span>
                      </div>
                    )}
                  </div>

                  {company?.website && (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Visit Company Website
                      <IconExternalLink className="size-3" />
                    </a>
                  )}
                </CardContent>

                <CardFooter className="border-t pt-4">
                  {isPending ? (
                    <div className="flex w-full gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenDecisionDialog(offer, "ACCEPTED")}
                      >
                        <IconCheck className="mr-1.5 size-4" />
                        Accept Offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => handleOpenDecisionDialog(offer, "REJECTED")}
                      >
                        <IconX className="mr-1.5 size-4" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full text-center text-xs text-muted-foreground">
                      Decision submitted on {formatDate(offer.decided_at || offer.extended_at)}
                    </div>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decisionType === "ACCEPTED" ? "Accept Job Offer?" : "Decline Job Offer?"}
            </DialogTitle>
            <DialogDescription>
              {decisionType === "ACCEPTED" ? (
                <span>
                  By accepting this offer for <strong>{selectedOffer?.application?.job_college_mapping?.job?.title}</strong> at <strong>{selectedOffer?.application?.job_college_mapping?.job?.company?.company_name}</strong> (₹{selectedOffer?.ctc_offered} LPA), you will be marked as PLACED. This decision is binding and updates your placement status.
                </span>
              ) : (
                <span>
                  Are you sure you want to decline this offer for <strong>{selectedOffer?.application?.job_college_mapping?.job?.title}</strong> at <strong>{selectedOffer?.application?.job_college_mapping?.job?.company?.company_name}</strong>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={handleCloseDialog} disabled={confirming}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={decisionType === "ACCEPTED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
              onClick={handleConfirmDecision}
              disabled={confirming}
            >
              {confirming && <IconLoader className="mr-1.5 size-4 animate-spin" />}
              Confirm {decisionType === "ACCEPTED" ? "Acceptance" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}
