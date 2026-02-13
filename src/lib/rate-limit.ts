import { NextRequest, NextResponse } from 'next/server'
import { config } from './config'
import { errorResponse, ErrorCodes } from './errors'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or Upstash
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Cleanup every minute

interface RateLimitConfig {
  window: number // Window in seconds
  max: number // Max requests per window
}

/**
 * Get rate limit key from request
 */
function getRateLimitKey(request: NextRequest, prefix: string): string {
  // Try to get user ID from session cookie first
  const sessionCookie = request.cookies.get('crafted.session_token')?.value

  // Use IP as fallback
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Combine prefix with identifier
  const identifier = sessionCookie ? `user:${sessionCookie.substring(0, 16)}` : `ip:${ip}`

  return `${prefix}:${identifier}`
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  prefix: string = 'api',
  customConfig?: RateLimitConfig
): { limited: boolean; remaining: number; resetIn: number } {
  const rateLimitConfig = customConfig || config.rateLimits.api
  const key = getRateLimitKey(request, prefix)
  const now = Date.now()
  const windowMs = rateLimitConfig.window * 1000

  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, entry)
  }

  // Increment count
  entry.count++

  const remaining = Math.max(0, rateLimitConfig.max - entry.count)
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)

  return {
    limited: entry.count > rateLimitConfig.max,
    remaining,
    resetIn,
  }
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  prefix: string = 'api',
  customConfig?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { limited, remaining, resetIn } = checkRateLimit(request, prefix, customConfig)

    if (limited) {
      const response = errorResponse(
        ErrorCodes.RATE_LIMITED,
        'Too many requests. Please try again later.',
        429,
        { retryAfter: resetIn }
      )

      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', String(resetIn))
      response.headers.set('Retry-After', String(resetIn))

      return response
    }

    const response = await handler(request)

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set('X-RateLimit-Reset', String(resetIn))

    return response
  }
}

/**
 * Preset rate limiters for different endpoints
 */
export const rateLimiters = {
  api: (request: NextRequest) => checkRateLimit(request, 'api', config.rateLimits.api),
  auth: (request: NextRequest) => checkRateLimit(request, 'auth', config.rateLimits.auth),
  chat: (request: NextRequest) => checkRateLimit(request, 'chat', config.rateLimits.chat),
}
