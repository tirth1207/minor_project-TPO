export type ApplicationStatus =
  | "APPLIED"
  | "WITHDRAWN"
  | "SHORTLISTED"
  | "REJECTED"
  | "OFFERED"

const allowedTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["OFFERED", "REJECTED"],
  OFFERED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

export function canTransitionApplication(
  current: ApplicationStatus,
  next: ApplicationStatus
): boolean {
  return allowedTransitions[current]?.includes(next) ?? false
}

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    value === "APPLIED" ||
    value === "WITHDRAWN" ||
    value === "SHORTLISTED" ||
    value === "REJECTED" ||
    value === "OFFERED"
  )
}
