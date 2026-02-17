import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockGetPayoutSettings = vi.fn()
vi.mock('@/lib/platform-settings', () => ({
  getPayoutSettings: (...args: unknown[]) => mockGetPayoutSettings(...args),
}))

const mockCalculatePayoutAmounts = vi.fn()
const mockCreatePayoutRequest = vi.fn()
const mockProcessPayoutTransfer = vi.fn()
const mockGetConnectAccount = vi.fn()
vi.mock('@/lib/stripe-connect', () => ({
  calculatePayoutAmounts: (...args: unknown[]) => mockCalculatePayoutAmounts(...args),
  createPayoutRequest: (...args: unknown[]) => mockCreatePayoutRequest(...args),
  processPayoutTransfer: (...args: unknown[]) => mockProcessPayoutTransfer(...args),
  getConnectAccount: (...args: unknown[]) => mockGetConnectAccount(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    status: 'status',
    freelancerId: 'freelancerId',
    creditsUsed: 'creditsUsed',
    completedAt: 'completedAt',
  },
  payouts: {
    id: 'id',
    freelancerId: 'freelancerId',
    creditsAmount: 'creditsAmount',
    netAmountUsd: 'netAmountUsd',
    status: 'status',
    payoutMethod: 'payoutMethod',
    requestedAt: 'requestedAt',
    processedAt: 'processedAt',
    failureReason: 'failureReason',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
  desc: vi.fn(),
  sum: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
}))

const { GET, POST } = await import('./route')

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/freelancer/payouts',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

const defaultPayoutSettings = {
  minimumPayoutCredits: 10,
  artistPercentage: 80,
  holdingPeriodDays: 7,
  creditValueUSD: 1.0,
}

function setupAuth(userId = 'freelancer-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test Freelancer', email: 'freelancer@test.com' },
  })
}

// Returns a chainable select that resolves from any chain pattern
// Drizzle queries can terminate at .where() (acts as thenable), .limit(), .groupBy(), etc.
function chainableSelect(result: unknown[]) {
  // Create a thenable where result that also has chainable methods
  const makeWhere = () => {
    const whereResult = Object.assign(Promise.resolve(result), {
      limit: vi.fn().mockResolvedValue(result),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
      groupBy: vi.fn().mockResolvedValue(result),
    })
    return whereResult
  }

  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => makeWhere()),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => makeWhere()),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPayoutSettings.mockResolvedValue(defaultPayoutSettings)
})

describe('GET /api/freelancer/payouts', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns earnings stats and payout history', async () => {
    setupAuth()
    // The route makes many db.select() calls — mock them in order
    // 1. lifetimeResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '500' }]))
    // 2. availableResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '400' }]))
    // 3. pendingCompletedResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '50' }]))
    // 4. pendingReviewResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '50', count: 2 }]))
    // 5. thisMonthResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '100' }]))
    // 6. lastMonthResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '80' }]))
    // 7. recentEarnings
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          taskId: 'task-1',
          taskTitle: 'Logo Design',
          credits: 10,
          completedAt: new Date('2025-01-01'),
        },
      ])
    )
    // 8. monthlyResult (groupBy)
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 9. payoutHistoryResult
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'payout-1',
          amount: 100,
          netAmountUsd: '80.00',
          status: 'COMPLETED',
          payoutMethod: 'stripe_connect',
          requestedAt: new Date('2025-01-01'),
          processedAt: new Date('2025-01-02'),
          failureReason: null,
        },
      ])
    )
    // 10. totalPaidOutResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '100' }]))
    // 11. pendingPayoutsResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '0' }]))

    mockGetConnectAccount.mockResolvedValue({
      payoutsEnabled: true,
      detailsSubmitted: true,
      externalAccountLast4: '4242',
    })

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.stats).toBeDefined()
    expect(data.data.stripeConnectStatus.connected).toBe(true)
    expect(data.data.payoutConfig).toBeDefined()
  })

  it('returns not connected stripe status when no account', async () => {
    setupAuth()
    // GET makes 11 db.select() calls in sequence:
    // 1-6: sum queries (lifetime, available, pendingCompleted, pendingReview, thisMonth, lastMonth)
    for (let i = 0; i < 6; i++) {
      mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '0', count: 0 }]))
    }
    // 7: recentEarnings (.orderBy().limit())
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 8: monthlyResult (.groupBy())
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 9: payoutHistory (.orderBy().limit())
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 10: totalPaidOut
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '0' }]))
    // 11: pendingPayouts
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '0' }]))

    mockGetConnectAccount.mockResolvedValue(null)

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.stripeConnectStatus.connected).toBe(false)
  })

  it('returns zero balances and empty arrays when no data', async () => {
    setupAuth()
    // 1-6: sum queries
    for (let i = 0; i < 6; i++) {
      mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: null, count: 0 }]))
    }
    // 7: recentEarnings
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 8: monthlyResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 9: payoutHistory
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    // 10: totalPaidOut
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: null }]))
    // 11: pendingPayouts
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: null }]))

    mockGetConnectAccount.mockResolvedValue(null)

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.stats.lifetimeEarnings).toBe(0)
    expect(data.data.stats.availableBalance).toBe(0)
    expect(data.data.earnings).toEqual([])
    expect(data.data.monthlyEarnings).toHaveLength(6)
    expect(data.data.payoutHistory).toEqual([])
  })
})

describe('POST /api/freelancer/payouts', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ creditsAmount: 50 }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 when amount is below minimum', async () => {
    setupAuth()

    const response = await POST(makeRequest({ creditsAmount: 5 }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 when no Stripe account connected', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue(null)

    const response = await POST(makeRequest({ creditsAmount: 50 }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('Stripe')
  })

  it('returns 400 when payouts not enabled on Stripe', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_123',
      payoutsEnabled: false,
    })

    const response = await POST(makeRequest({ creditsAmount: 50 }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('onboarding')
  })

  it('processes payout successfully', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_123',
      payoutsEnabled: true,
    })
    // availableResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '200' }]))
    // paidOutResult
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '50' }]))

    mockCalculatePayoutAmounts.mockReturnValue({ netAmountUsd: 40 })
    mockCreatePayoutRequest.mockResolvedValue({ payoutId: 'payout-1' })
    mockProcessPayoutTransfer.mockResolvedValue({
      success: true,
      transferId: 'tr_123',
    })

    const response = await POST(makeRequest({ creditsAmount: 50 }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.payoutId).toBe('payout-1')
    expect(data.data.transferId).toBe('tr_123')
  })

  it('returns 400 when insufficient balance', async () => {
    setupAuth()
    mockGetConnectAccount.mockResolvedValue({
      stripeAccountId: 'acct_123',
      payoutsEnabled: true,
    })
    // availableResult — only 30 credits earned
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '30' }]))
    // paidOutResult — 20 already paid
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ total: '20' }]))

    const response = await POST(makeRequest({ creditsAmount: 50 }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('Insufficient')
  })
})
