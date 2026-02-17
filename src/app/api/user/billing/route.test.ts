import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', credits: 'credits' },
  creditTransactions: {
    id: 'id',
    userId: 'userId',
    amount: 'amount',
    type: 'type',
    description: 'description',
    createdAt: 'createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableSelectWithOrderLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/user/billing', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 404 when user not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('returns credits and transaction history', async () => {
    setupAuth()
    // User credits lookup
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ credits: 25 }]))
    // Transaction history
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithOrderLimit([
        {
          id: 'tx-1',
          amount: 50,
          type: 'PURCHASE',
          description: 'Purchased 50 credits',
          createdAt: new Date(),
        },
        {
          id: 'tx-2',
          amount: -5,
          type: 'USAGE',
          description: 'Task created: Logo Design',
          createdAt: new Date(),
        },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.credits).toBe(25)
    expect(data.data.transactions).toHaveLength(2)
  })

  it('returns empty transactions for new user', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ credits: 0 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectWithOrderLimit([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.credits).toBe(0)
    expect(data.data.transactions).toHaveLength(0)
  })
})
