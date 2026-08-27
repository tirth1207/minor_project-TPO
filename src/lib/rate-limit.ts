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

/**
 * Basic in-memory sliding window rate limiter for API routes.
 * Prevents rapid abuse of sensitive endpoints like auth and AI models.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 20 }
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = tracker.get(identifier)

  if (!record || now > record.resetTime) {
    const newRecord: RecordItem = {
      count: 1,
      resetTime: now + options.windowMs,
    }
    tracker.set(identifier, newRecord)
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
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
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again later." },
    { status: 429 }
  )
}
