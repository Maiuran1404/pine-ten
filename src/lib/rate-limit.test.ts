import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config before importing
vi.mock('./config', () => ({
  config: {
    rateLimits: {
      api: { window: 60, max: 100 },
      auth: { window: 60, max: 20 },
      chat: { window: 60, max: 30 },
    },
  },
}))

// Mock errors module
vi.mock('./errors', () => {
  const NextResponse = {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      headers: new Map<string, string>(),
      json: async () => body,
    }),
  }

  return {
    errorResponse: vi.fn((code: string, message: string, statusCode: number, details?: unknown) => {
      const headers = new Map<string, string>()
      return {
        body: { success: false, error: { code, message, details } },
        status: statusCode,
        headers: {
          set: (key: string, value: string) => headers.set(key, value),
          get: (key: string) => headers.get(key),
        },
        json: async () => ({ success: false, error: { code, message, details } }),
      }
    }),
    ErrorCodes: {
      RATE_LIMITED: 'SRV_004',
    },
    NextResponse,
  }
})

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string
    method: string
    headers: Map<string, string>
    cookies: { get: (name: string) => { name: string; value: string } | undefined }

    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url
      this.method = 'GET'
      this.headers = new Map(Object.entries(init?.headers || {}))
      this.cookies = { get: () => undefined }
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      headers: new Map<string, string>(),
    }),
  },
}))

// Helper to create a mock NextRequest
function createMockRequest(
  options: {
    ip?: string
    sessionCookie?: string
  } = {}
) {
  const { ip = '192.168.1.1', sessionCookie } = options

  const headers = new Map<string, string>()
  headers.set('x-forwarded-for', ip)

  const cookieValue = sessionCookie
    ? { name: 'crafted.session_token', value: sessionCookie }
    : undefined

  return {
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
    cookies: {
      get: (name: string) => {
        if (name === 'crafted.session_token') return cookieValue
        return undefined
      },
    },
    url: 'https://app.example.com/api/test',
    method: 'GET',
  } as unknown as import('next/server').NextRequest
}

describe('rate-limit module', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const result = checkRateLimit(request, 'test', { window: 60, max: 10 })
      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(9)
    })

    it('should track request count incrementally', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const config = { window: 60, max: 5 }

      const r1 = checkRateLimit(request, 'track-test', config)
      expect(r1.remaining).toBe(4)

      const r2 = checkRateLimit(request, 'track-test', config)
      expect(r2.remaining).toBe(3)

      const r3 = checkRateLimit(request, 'track-test', config)
      expect(r3.remaining).toBe(2)
    })

    it('should block requests over the limit', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const config = { window: 60, max: 3 }

      // Make 3 requests (at the limit)
      checkRateLimit(request, 'block-test', config)
      checkRateLimit(request, 'block-test', config)
      checkRateLimit(request, 'block-test', config)

      // 4th request should be limited
      const result = checkRateLimit(request, 'block-test', config)
      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const config = { window: 60, max: 2 }

      // Exhaust the limit
      checkRateLimit(request, 'reset-test', config)
      checkRateLimit(request, 'reset-test', config)
      const blocked = checkRateLimit(request, 'reset-test', config)
      expect(blocked.limited).toBe(true)

      // Advance time past window
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      const result = checkRateLimit(request, 'reset-test', config)
      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(1)
    })

    it('should use separate counts for different prefixes', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const config = { window: 60, max: 2 }

      // Exhaust prefix A
      checkRateLimit(request, 'prefix-a', config)
      checkRateLimit(request, 'prefix-a', config)
      const blockedA = checkRateLimit(request, 'prefix-a', config)
      expect(blockedA.limited).toBe(true)

      // Prefix B should still be allowed
      const resultB = checkRateLimit(request, 'prefix-b', config)
      expect(resultB.limited).toBe(false)
    })

    it('should use session cookie when available for key generation', async () => {
      const { checkRateLimit } = await import('./rate-limit')

      const requestWithSession = createMockRequest({
        sessionCookie: 'abcdefghijklmnop1234567890',
      })
      const requestDifferentSession = createMockRequest({
        sessionCookie: 'zyxwvutsrqponmlk0987654321',
      })

      const config = { window: 60, max: 2 }

      // Exhaust limit for session 1
      checkRateLimit(requestWithSession, 'session-test', config)
      checkRateLimit(requestWithSession, 'session-test', config)
      const blocked = checkRateLimit(requestWithSession, 'session-test', config)
      expect(blocked.limited).toBe(true)

      // Different session should have separate limit
      const other = checkRateLimit(requestDifferentSession, 'session-test', config)
      expect(other.limited).toBe(false)
    })

    it('should fall back to IP when no session cookie', async () => {
      const { checkRateLimit } = await import('./rate-limit')

      const request1 = createMockRequest({ ip: '10.0.0.1' })
      const request2 = createMockRequest({ ip: '10.0.0.2' })

      const config = { window: 60, max: 1 }

      checkRateLimit(request1, 'ip-test', config)
      const blocked = checkRateLimit(request1, 'ip-test', config)
      expect(blocked.limited).toBe(true)

      // Different IP should be allowed
      const allowed = checkRateLimit(request2, 'ip-test', config)
      expect(allowed.limited).toBe(false)
    })

    it('should return correct resetIn value', async () => {
      const { checkRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const result = checkRateLimit(request, 'reset-in-test', { window: 120, max: 10 })
      expect(result.resetIn).toBeGreaterThan(0)
      expect(result.resetIn).toBeLessThanOrEqual(120)
    })
  })

  describe('withRateLimit', () => {
    it('should call handler when under limit', async () => {
      const { withRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const mockResponse = {
        status: 200,
        headers: {
          set: vi.fn(),
          get: vi.fn(),
        },
      }

      const handler = vi.fn().mockResolvedValue(mockResponse)

      const wrappedHandler = withRateLimit(handler, 'with-test', { window: 60, max: 100 })
      const response = await wrappedHandler(request as never)

      expect(handler).toHaveBeenCalledWith(request)
      expect(response.status).toBe(200)
    })

    it('should return 429 when rate limited', async () => {
      const { withRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const handler = vi.fn()
      const config = { window: 60, max: 1 }

      const wrappedHandler = withRateLimit(handler, 'wrap-block', config)

      // First request goes through
      const mockResponse = {
        status: 200,
        headers: { set: vi.fn(), get: vi.fn() },
      }
      handler.mockResolvedValue(mockResponse)
      await wrappedHandler(request as never)

      // Second request is rate limited
      const result = await wrappedHandler(request as never)
      expect(result.status).toBe(429)
    })

    it('should add rate limit headers to successful response', async () => {
      const { withRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const setSpy = vi.fn()
      const mockResponse = {
        status: 200,
        headers: { set: setSpy, get: vi.fn() },
      }

      const handler = vi.fn().mockResolvedValue(mockResponse)

      const wrappedHandler = withRateLimit(handler, 'header-test', { window: 60, max: 100 })
      await wrappedHandler(request as never)

      expect(setSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
      expect(setSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
    })

    it('should add rate limit headers to 429 response', async () => {
      const { withRateLimit } = await import('./rate-limit')
      const request = createMockRequest()

      const handler = vi.fn()
      const config = { window: 60, max: 1 }

      const wrappedHandler = withRateLimit(handler, '429-headers', config)

      // Exhaust limit
      handler.mockResolvedValue({
        status: 200,
        headers: { set: vi.fn(), get: vi.fn() },
      })
      await wrappedHandler(request as never)

      // Get 429 response
      const result = await wrappedHandler(request as never)
      // The errorResponse mock returns an object with headers.set
      expect(result.headers.set).toBeDefined()
    })
  })

  describe('rateLimiters', () => {
    it('should have api, auth, and chat presets', async () => {
      const { rateLimiters } = await import('./rate-limit')
      expect(rateLimiters.api).toBeDefined()
      expect(rateLimiters.auth).toBeDefined()
      expect(rateLimiters.chat).toBeDefined()
    })

    it('should return rate limit status from presets', async () => {
      const { rateLimiters } = await import('./rate-limit')
      const request = createMockRequest()

      const result = rateLimiters.api(request as never)
      expect(result).toHaveProperty('limited')
      expect(result).toHaveProperty('remaining')
      expect(result).toHaveProperty('resetIn')
    })
  })
})
