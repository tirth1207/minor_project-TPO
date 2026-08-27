import { describe, it, expect } from "vitest"

export function processOfferAcceptance(
  targetOfferId: string,
  offers: Array<{ id: string; studentId: string; status: string }>,
  applications: Array<{ id: string; studentId: string; status: string }>
) {
  const targetOffer = offers.find(o => o.id === targetOfferId)
  if (!targetOffer) throw new Error("Offer not found")

  const studentId = targetOffer.studentId

  const updatedOffers = offers.map(o => {
    if (o.id === targetOfferId) {
      return { ...o, status: "ACCEPTED" }
    }
    if (o.studentId === studentId && o.status === "EXTENDED") {
      return { ...o, status: "AUTO_WITHDRAWN" }
    }
    return o
  })

  const updatedApplications = applications.map(a => {
    if (a.studentId === studentId && a.status !== "OFFERED") {
      return { ...a, status: "WITHDRAWN" }
    }
    return a
  })

  return {
    studentPlaced: true,
    updatedOffers,
    updatedApplications
  }
}

describe("Offer Acceptance State Machine", () => {
  it("should flip student status to placed, accept offer, auto-withdraw other offers, and withdraw active applications", () => {
    const studentId = "student-123"

    const offers = [
      { id: "offer-1", studentId, status: "EXTENDED" },
      { id: "offer-2", studentId, status: "EXTENDED" }
    ]

    const applications = [
      { id: "app-1", studentId, status: "OFFERED" },
      { id: "app-2", studentId, status: "OFFERED" },
      { id: "app-3", studentId, status: "SHORTLISTED" }
    ]

    const result = processOfferAcceptance("offer-1", offers, applications)

    expect(result.studentPlaced).toBe(true)
    expect(result.updatedOffers.find(o => o.id === "offer-1")?.status).toBe("ACCEPTED")
    expect(result.updatedOffers.find(o => o.id === "offer-2")?.status).toBe("AUTO_WITHDRAWN")
    expect(result.updatedApplications.find(a => a.id === "app-3")?.status).toBe("WITHDRAWN")
  })
})
