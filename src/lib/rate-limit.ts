import { NextRequest, NextResponse } from 'next/server'
import { config } from './config'
import { errorResponse, ErrorCodes } from './errors'

/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * Uses @upstash/ratelimit with sliding window algorithm for production.
 * Falls back to in-memory Map when UPSTASH_REDIS_REST_URL is not set
 * (dev/test environments).
 *
 * The exported API is async (Upstash uses HTTP REST calls) but otherwise
 * identical to the previous in-memory implementation, so callers just
 * need to `await` the result.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitConfig {
  window: number // Window in seconds
  max: number // Max requests per window
}

interface RateLimitResult {
  limited: boolean
  remaining: number
  resetIn: number
}

// ---------------------------------------------------------------------------
// Identifier extraction (shared by both backends)
// ---------------------------------------------------------------------------

function getRateLimitKey(request: NextRequest, prefix: string): string {
  const sessionCookie = request.cookies.get('crafted.session_token')?.value
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const identifier = sessionCookie ? `user:${sessionCookie.substring(0, 16)}` : `ip:${ip}`
  return `${prefix}:${identifier}`
}

// ---------------------------------------------------------------------------
// In-memory fallback (dev / test / missing env vars)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (only in long-lived processes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}

function checkRateLimitInMemory(
  request: NextRequest,
  prefix: string,
  rateLimitConfig: RateLimitConfig
): RateLimitResult {
  const key = getRateLimitKey(request, prefix)
  const now = Date.now()
  const windowMs = rateLimitConfig.window * 1000

  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs }
    rateLimitStore.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, rateLimitConfig.max - entry.count)
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)

  return {
    limited: entry.count > rateLimitConfig.max,
    remaining,
    resetIn,
  }
}

// ---------------------------------------------------------------------------
// Upstash backend (production)
// ---------------------------------------------------------------------------

// Lazy-loaded Upstash modules and cached instances
let upstashRedis: InstanceType<typeof import('@upstash/redis').Redis> | null = null
const upstashLimiters = new Map<
  string,
  InstanceType<typeof import('@upstash/ratelimit').Ratelimit>
>()

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function getUpstashRedis() {
  if (!upstashRedis) {
    const { Redis } = await import('@upstash/redis')
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return upstashRedis
}

async function getUpstashLimiter(rateLimitConfig: RateLimitConfig) {
  const cacheKey = `${rateLimitConfig.window}:${rateLimitConfig.max}`
  let limiter = upstashLimiters.get(cacheKey)
  if (!limiter) {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const redis = await getUpstashRedis()
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rateLimitConfig.max, `${rateLimitConfig.window} s`),
      prefix: 'rl',
    })
    upstashLimiters.set(cacheKey, limiter)
  }
  return limiter
}

async function checkRateLimitUpstash(
  request: NextRequest,
  prefix: string,
  rateLimitConfig: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const identifier = getRateLimitKey(request, prefix)
    const limiter = await getUpstashLimiter(rateLimitConfig)
    const { success, remaining, reset } = await limiter.limit(identifier)

    const resetIn = Math.max(0, Math.ceil((reset - Date.now()) / 1000))

    return {
      limited: !success,
      remaining,
      resetIn,
    }
  } catch {
    // Upstash unreachable — fall back to in-memory rate limiting
    console.warn(`[rate-limit] Upstash unreachable for ${prefix}, falling back to in-memory`)
    return checkRateLimitInMemory(request, prefix, rateLimitConfig)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if request is rate limited.
 *
 * Returns a promise — callers must `await` the result.
 * Uses Upstash Redis in production, in-memory Map as fallback.
 */
export async function checkRateLimit(
  request: NextRequest,
  prefix: string = 'api',
  customConfig?: RateLimitConfig
): Promise<RateLimitResult> {
  const rateLimitConfig = customConfig || config.rateLimits.api

  if (isUpstashConfigured()) {
    return checkRateLimitUpstash(request, prefix, rateLimitConfig)
  }

  return checkRateLimitInMemory(request, prefix, rateLimitConfig)
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
    const { limited, remaining, resetIn } = await checkRateLimit(request, prefix, customConfig)

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
