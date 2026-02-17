import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockCreateConnectAccount = vi.fn()
const mockGetConnectAccount = vi.fn()
const mockGetOnboardingLink = vi.fn()
const mockGetDashboardLink = vi.fn()
const mockSyncConnectAccountStatus = vi.fn()
vi.mock('@/lib/stripe-connect', () => ({
  createConnectAccount: (...args: unknown[]) => mockCreateConnectAccount(...args),
  getConnectAccount: (...args: unknown[]) => mockGetConnectAccount(...args),
  getOnboardingLink: (...args: unknown[]) => mockGetOnboardingLink(...args),
  getDashboardLink: (...args: unknown[]) => mockGetDashboardLink(...args),
  syncConnectAccountStatus: (...args: unknown[]) => mockSyncConnectAccountStatus(...args),
}))

vi.mock('@/lib/validations', () => ({
  stripeConnectActionSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

const { GET, POST } = await import('./route')

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/freelancer/stripe-connect',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth(userId = 'freelancer-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test Freelancer', email: 'freelancer@test.com' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/freelancer/stripe-connect', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns not connected when no account exists', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.connected).toBe(false)
    expect(data.data.account).toBeNull()
  })

  it('returns connected status with synced account details', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      id: 'connect-1',
      stripeAccountId: 'acct_123',
      country: 'US',
      defaultCurrency: 'usd',
    })
    mockSyncConnectAccountStatus.mockResolvedValue({
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      externalAccountLast4: '4242',
      externalAccountType: 'card',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.connected).toBe(true)
    expect(data.data.account.stripeAccountId).toBe('acct_123')
    expect(data.data.account.payoutsEnabled).toBe(true)
    expect(data.data.account.externalAccountLast4).toBe('4242')
  })
})

describe('POST /api/freelancer/stripe-connect', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ action: 'create' }) as never)
    expect(response.status).toBe(401)
  })

  it('creates a new Connect account when none exists', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue(null)
    mockCreateConnectAccount.mockResolvedValue({
      accountId: 'acct_new',
      onboardingUrl: 'https://connect.stripe.com/setup/123',
    })

    const response = await POST(makeRequest({ action: 'create', country: 'US' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.accountId).toBe('acct_new')
    expect(mockCreateConnectAccount).toHaveBeenCalledWith(
      'freelancer-1',
      'freelancer@test.com',
      'US'
    )
  })

  it('returns onboarding link when account already exists on create', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_existing',
    })
    mockGetOnboardingLink.mockResolvedValue('https://connect.stripe.com/onboarding/456')

    const response = await POST(makeRequest({ action: 'create' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.onboardingUrl).toBe('https://connect.stripe.com/onboarding/456')
  })

  it('returns 404 for onboarding action when no account', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue(null)

    const response = await POST(makeRequest({ action: 'onboarding' }) as never)
    expect(response.status).toBe(404)
  })

  it('returns dashboard link for existing completed account', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_existing',
      detailsSubmitted: true,
    })
    mockGetDashboardLink.mockResolvedValue('https://connect.stripe.com/dashboard/789')

    const response = await POST(makeRequest({ action: 'dashboard' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.dashboardUrl).toBe('https://connect.stripe.com/dashboard/789')
  })

  it('returns 400 for dashboard when onboarding not complete', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_existing',
      detailsSubmitted: false,
    })

    const response = await POST(makeRequest({ action: 'dashboard' }) as never)
    expect(response.status).toBe(400)
  })
})
