import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Mock better-auth/cookies
const mockGetSessionCookie = vi.fn()
vi.mock('better-auth/cookies', () => ({
  getSessionCookie: (...args: unknown[]) => mockGetSessionCookie(...args),
}))

// Mock rate limiters to not interfere with auth tests
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    auth: vi.fn().mockReturnValue({ limited: false, remaining: 19, resetIn: 60 }),
    api: vi.fn().mockReturnValue({ limited: false, remaining: 99, resetIn: 60 }),
    chat: vi.fn().mockReturnValue({ limited: false, remaining: 29, resetIn: 60 }),
  },
}))

// Mock next/server with proper NextResponse behavior
vi.mock('next/server', () => {
  class MockNextResponse {
    body: string | null
    status: number
    headers: Map<string, string>
    redirectUrl?: string;
    [key: string]: unknown

    constructor(body: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = new Map(Object.entries(init?.headers ?? {}))
    }

    async json() {
      return this.body ? JSON.parse(this.body) : null
    }

    static next() {
      const response = new MockNextResponse(null, { status: 200 })
      return response
    }

    static redirect(url: URL) {
      const response = new MockNextResponse(null, { status: 307 })
      response.redirectUrl = url.toString()
      return response
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class {},
  }
})

/**
 * Create a mock NextRequest for testing middleware behavior
 */
function createMockRequest(
  pathname: string,
  options: { host?: string; searchParams?: Record<string, string> } = {}
): NextRequest {
  const { host = 'localhost:3000', searchParams = {} } = options
  const params = new URLSearchParams(searchParams)
  const urlStr = `http://${host}${pathname}${params.toString() ? '?' + params.toString() : ''}`
  const url = new URL(urlStr)

  return {
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
    },
    url: urlStr,
    headers: {
      get: (name: string) => {
        if (name === 'host') return host
        return null
      },
    },
    cookies: {
      get: (name: string) => {
        if (name === 'crafted.session_token') {
          return { name: 'crafted.session_token', value: 'mock-session-value' }
        }
        return undefined
      },
    },
  } as unknown as NextRequest
}

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('isPublicPath', () => {
    it('identifies public page routes', async () => {
      const { isPublicPath } = await import('./proxy')

      expect(isPublicPath('/login')).toBe(true)
      expect(isPublicPath('/register')).toBe(true)
      expect(isPublicPath('/early-access')).toBe(true)
      expect(isPublicPath('/onboarding')).toBe(true)
      expect(isPublicPath('/auth-error')).toBe(true)
    })

    it('identifies public API routes', async () => {
      const { isPublicPath } = await import('./proxy')

      expect(isPublicPath('/api/auth')).toBe(true)
      expect(isPublicPath('/api/auth/login')).toBe(true)
      expect(isPublicPath('/api/auth/callback/google')).toBe(true)
      expect(isPublicPath('/api/webhooks')).toBe(true)
      expect(isPublicPath('/api/webhooks/stripe')).toBe(true)
      expect(isPublicPath('/api/health')).toBe(true)
      expect(isPublicPath('/api/csrf')).toBe(true)
      expect(isPublicPath('/api/openapi')).toBe(true)
    })

    it('identifies non-public routes', async () => {
      const { isPublicPath } = await import('./proxy')

      expect(isPublicPath('/admin')).toBe(false)
      expect(isPublicPath('/dashboard')).toBe(false)
      expect(isPublicPath('/portal')).toBe(false)
      expect(isPublicPath('/api/admin/clients')).toBe(false)
      expect(isPublicPath('/api/freelancer/tasks')).toBe(false)
    })
  })

  describe('isProtectedApiRoute', () => {
    it('identifies protected API routes', async () => {
      const { isProtectedApiRoute } = await import('./proxy')

      expect(isProtectedApiRoute('/api/admin')).toBe(true)
      expect(isProtectedApiRoute('/api/admin/clients')).toBe(true)
      expect(isProtectedApiRoute('/api/admin/tasks/123')).toBe(true)
      expect(isProtectedApiRoute('/api/freelancer')).toBe(true)
      expect(isProtectedApiRoute('/api/freelancer/tasks')).toBe(true)
    })

    it('does not flag non-protected API routes', async () => {
      const { isProtectedApiRoute } = await import('./proxy')

      expect(isProtectedApiRoute('/api/auth')).toBe(false)
      expect(isProtectedApiRoute('/api/health')).toBe(false)
      expect(isProtectedApiRoute('/api/csrf')).toBe(false)
      expect(isProtectedApiRoute('/api/webhooks/stripe')).toBe(false)
      expect(isProtectedApiRoute('/api/chat')).toBe(false)
    })
  })

  describe('isProtectedPageRoute', () => {
    it('identifies protected page routes', async () => {
      const { isProtectedPageRoute } = await import('./proxy')

      expect(isProtectedPageRoute('/admin')).toBe(true)
      expect(isProtectedPageRoute('/admin/clients')).toBe(true)
      expect(isProtectedPageRoute('/dashboard')).toBe(true)
      expect(isProtectedPageRoute('/dashboard/chat')).toBe(true)
      expect(isProtectedPageRoute('/portal')).toBe(true)
      expect(isProtectedPageRoute('/portal/tasks')).toBe(true)
    })

    it('does not flag non-protected page routes', async () => {
      const { isProtectedPageRoute } = await import('./proxy')

      expect(isProtectedPageRoute('/login')).toBe(false)
      expect(isProtectedPageRoute('/register')).toBe(false)
      expect(isProtectedPageRoute('/')).toBe(false)
    })
  })

  describe('public routes pass through', () => {
    it('allows /login without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/login')

      const response = await proxy(request)

      expect(response.status).toBe(200)
      expect((response as unknown as Record<string, unknown>).redirectUrl).toBeUndefined()
    })

    it('allows /register with invite code without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/register', { searchParams: { code: 'ABC123' } })

      const response = await proxy(request)

      // /register is a public path, so it should pass through
      expect(response.status).toBe(200)
    })

    it('allows /early-access without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/early-access')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/auth/* without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/auth/login')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/health without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/health')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/csrf without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/csrf')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/webhooks/* without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/webhooks/stripe')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/openapi without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/openapi')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows static files without a session', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/logo.png')

      const response = await proxy(request)

      // Static files (containing '.') pass through
      expect(response.status).toBe(200)
    })
  })

  describe('protected routes without session redirect or return 401', () => {
    it('redirects /admin to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/admin')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
      expect(redirectUrl).toContain('redirect=%2Fadmin')
    })

    it('redirects /admin/clients to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/admin/clients')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
      expect(redirectUrl).toContain('redirect=%2Fadmin%2Fclients')
    })

    it('redirects /dashboard to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/dashboard')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
      expect(redirectUrl).toContain('redirect=%2Fdashboard')
    })

    it('redirects /dashboard/chat to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/dashboard/chat')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
    })

    it('redirects /portal to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/portal')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
      expect(redirectUrl).toContain('redirect=%2Fportal')
    })

    it('redirects /portal/tasks to /login when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/portal/tasks')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/login')
    })

    it('returns 401 JSON for /api/admin/* when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/admin/clients')

      const response = await proxy(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      })
    })

    it('returns 401 JSON for /api/freelancer/* when no session cookie', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/freelancer/tasks')

      const response = await proxy(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      })
    })
  })

  describe('protected routes with session pass through', () => {
    it('allows /admin with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/admin')

      const response = await proxy(request)

      expect(response.status).toBe(200)
      expect((response as unknown as Record<string, unknown>).redirectUrl).toBeUndefined()
    })

    it('allows /dashboard with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/dashboard')

      const response = await proxy(request)

      expect(response.status).toBe(200)
      expect((response as unknown as Record<string, unknown>).redirectUrl).toBeUndefined()
    })

    it('allows /dashboard/chat with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/dashboard/chat')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /portal with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/portal')

      const response = await proxy(request)

      expect(response.status).toBe(200)
      expect((response as unknown as Record<string, unknown>).redirectUrl).toBeUndefined()
    })

    it('allows /portal/tasks with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/portal/tasks')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })

    it('allows /api/admin/* with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/admin/clients')

      const response = await proxy(request)

      expect(response.status).toBe(200)
      expect((response as unknown as Record<string, unknown>).redirectUrl).toBeUndefined()
    })

    it('allows /api/freelancer/* with a valid session cookie', async () => {
      mockGetSessionCookie.mockReturnValue('mock-session-token-value')
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/api/freelancer/tasks')

      const response = await proxy(request)

      expect(response.status).toBe(200)
    })
  })

  describe('register invite code gate', () => {
    it('redirects /register to /early-access when no invite code', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/register')

      const response = await proxy(request)

      expect(response.status).toBe(307)
      const redirectUrl = (response as unknown as Record<string, unknown>).redirectUrl as string
      expect(redirectUrl).toContain('/early-access')
    })

    it('allows /register when invite code is present', async () => {
      mockGetSessionCookie.mockReturnValue(null)
      const { proxy } = await import('./proxy')
      const request = createMockRequest('/register', { searchParams: { code: 'INVITE123' } })

      const response = await proxy(request)

      // /register is public, so should pass through
      expect(response.status).toBe(200)
    })
  })
})
