import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsSlackConfigured = vi.fn()
const mockGetChannelConfig = vi.fn()
vi.mock('@/lib/slack', () => ({
  isSlackConfigured: (...args: unknown[]) => mockIsSlackConfigured(...args),
  getChannelConfig: (...args: unknown[]) => mockGetChannelConfig(...args),
}))

const { GET } = await import('./route')

describe('GET /api/webhooks/slack/test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetChannelConfig.mockReturnValue({
      superadminAlerts: 'C_ALERTS',
      newSignups: 'C_SIGNUPS',
      allTasks: 'C_TASKS',
      freelancerApps: 'C_APPS',
      creditPurchases: 'C_CREDITS',
      pendingReviews: 'C_REVIEWS',
    })
  })

  it('should return 401 in production without correct key', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalPwd = process.env.ADMIN_PASSWORD

    vi.stubEnv('NODE_ENV', 'production')
    process.env.ADMIN_PASSWORD = 'secret123'

    const request = new Request('http://localhost/api/webhooks/slack/test?key=wrong')
    ;(request as unknown as { nextUrl: { searchParams: URLSearchParams } }).nextUrl = new URL(
      request.url
    )

    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Not authorized')

    vi.stubEnv('NODE_ENV', originalEnv ?? 'test')
    process.env.ADMIN_PASSWORD = originalPwd
  })

  it('should return config status in development', async () => {
    const originalEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'development')

    mockIsSlackConfigured.mockReturnValue(true)

    const request = new Request('http://localhost/api/webhooks/slack/test')
    ;(request as unknown as { nextUrl: { searchParams: URLSearchParams } }).nextUrl = new URL(
      request.url
    )

    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.configured).toBe(true)
    expect(data.channels).toBeDefined()

    vi.stubEnv('NODE_ENV', originalEnv ?? 'test')
  })

  it('should allow access in production with correct key', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalPwd = process.env.ADMIN_PASSWORD

    vi.stubEnv('NODE_ENV', 'production')
    process.env.ADMIN_PASSWORD = 'correct-key'

    mockIsSlackConfigured.mockReturnValue(false)

    const request = new Request('http://localhost/api/webhooks/slack/test?key=correct-key')
    ;(request as unknown as { nextUrl: { searchParams: URLSearchParams } }).nextUrl = new URL(
      request.url
    )

    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.configured).toBe(false)

    vi.stubEnv('NODE_ENV', originalEnv ?? 'test')
    process.env.ADMIN_PASSWORD = originalPwd
  })

  it('should include channel config in response', async () => {
    const originalEnv = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'development')

    mockIsSlackConfigured.mockReturnValue(true)

    const request = new Request('http://localhost/api/webhooks/slack/test')
    ;(request as unknown as { nextUrl: { searchParams: URLSearchParams } }).nextUrl = new URL(
      request.url
    )

    const response = await GET(request as never)
    const data = await response.json()

    expect(data.channels.superadminAlerts).toContain('C_ALERTS')
    expect(data.channels.newSignups).toContain('C_SIGNUPS')

    vi.stubEnv('NODE_ENV', originalEnv ?? 'test')
  })
})
