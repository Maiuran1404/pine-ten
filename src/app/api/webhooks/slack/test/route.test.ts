import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsSlackConfigured = vi.fn()
const mockGetChannelConfig = vi.fn()
vi.mock('@/lib/slack', () => ({
  isSlackConfigured: (...args: unknown[]) => mockIsSlackConfigured(...args),
  getChannelConfig: (...args: unknown[]) => mockGetChannelConfig(...args),
}))

// Mock requireAdmin — default: allows access
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const { GET } = await import('./route')

describe('GET /api/webhooks/slack/test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockGetChannelConfig.mockReturnValue({
      superadminAlerts: 'C_ALERTS',
      newSignups: 'C_SIGNUPS',
      allTasks: 'C_TASKS',
      freelancerApps: 'C_APPS',
      creditPurchases: 'C_CREDITS',
      pendingReviews: 'C_REVIEWS',
    })
  })

  it('should return config status when admin is authenticated', async () => {
    mockIsSlackConfigured.mockReturnValue(true)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.configured).toBe(true)
    expect(data.data.channels).toBeDefined()
  })

  it('should mask sensitive values in response', async () => {
    mockIsSlackConfigured.mockReturnValue(true)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should show "Set" or "NOT SET", never raw values
    expect(data.data.channels.superadminAlerts).toBe('Set')
    expect(data.data.channels.newSignups).toBe('Set')
  })

  it('should show NOT SET when channels are not configured', async () => {
    mockIsSlackConfigured.mockReturnValue(false)
    mockGetChannelConfig.mockReturnValue({
      superadminAlerts: '',
      newSignups: '',
      allTasks: '',
      freelancerApps: '',
      creditPurchases: '',
      pendingReviews: '',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.configured).toBe(false)
    expect(data.data.channels.superadminAlerts).toBe('NOT SET')
  })

  it('should reject non-admin users', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden'))

    const response = await GET()

    expect(response.status).toBe(500)
  })
})
