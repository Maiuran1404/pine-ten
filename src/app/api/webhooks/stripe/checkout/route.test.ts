import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockCreateCheckoutSession = vi.fn()
vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/webhooks/stripe/checkout',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/webhooks/stripe/checkout', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ packageId: 'pkg-1' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 when packageId is missing', async () => {
    setupAuth()

    const response = await POST(makeRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Package ID')
  })

  it('creates checkout session and returns URL', async () => {
    setupAuth()
    mockCreateCheckoutSession.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    })

    const response = await POST(
      makeRequest({ packageId: 'pkg-10', returnUrl: 'https://app.test/billing' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.url).toBe('https://checkout.stripe.com/session-123')
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'user-1',
      'test@test.com',
      'pkg-10',
      'https://app.test/billing'
    )
  })
})
