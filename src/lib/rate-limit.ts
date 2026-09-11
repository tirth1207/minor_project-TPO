import { NextResponse } from "next/server"

type RateLimitOptions = {
  windowMs: number
  maxRequests: number
}

type RecordItem = {
  count: number
  resetTime: number
}

const tracker = new Map<string, RecordItem>()
const MAX_TRACKED_IDENTIFIERS = 10_000
const CLEANUP_INTERVAL = 100
let callsSinceCleanup = 0

function pruneExpired(now: number) {
  for (const [key, record] of tracker) {
    if (now > record.resetTime) tracker.delete(key)
  }
}

function enforceTrackerLimit(now: number) {
  if (tracker.size < MAX_TRACKED_IDENTIFIERS) return

  pruneExpired(now)
  if (tracker.size < MAX_TRACKED_IDENTIFIERS) return

  // Prefer evicting the record that expires soonest when the hard cap is hit.
  let oldestKey: string | undefined
  let oldestResetTime = Infinity

  for (const [key, record] of tracker) {
    if (record.resetTime < oldestResetTime) {
      oldestKey = key
      oldestResetTime = record.resetTime
    }
  }

  if (oldestKey) tracker.delete(oldestKey)
}

/**
 * Basic in-memory rate limiter for API routes.
 * This is intentionally bounded so attacker-controlled identifiers cannot
 * grow the process memory without limit. It remains process-local and is
 * not a replacement for a distributed limiter in multi-instance deployments.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 20 }
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now()

  callsSinceCleanup += 1
  if (callsSinceCleanup >= CLEANUP_INTERVAL) {
    callsSinceCleanup = 0
    pruneExpired(now)
  }

  const record = tracker.get(identifier)

  if (!record || now > record.resetTime) {
    enforceTrackerLimit(now)

    const newRecord: RecordItem = {
      count: 1,
      resetTime: now + options.windowMs,
    }
    tracker.set(identifier, newRecord)

    return {
      success: true,
      limit: options.maxRequests,
      remaining: Math.max(0, options.maxRequests - 1),
      resetTime: newRecord.resetTime,
    }
  }

  if (record.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  record.count += 1
  tracker.set(identifier, record)

  return {
    success: true,
    limit: options.maxRequests,
    remaining: Math.max(0, options.maxRequests - record.count),
    resetTime: record.resetTime,
  }
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again later." },
    { status: 429 }
  )
}
