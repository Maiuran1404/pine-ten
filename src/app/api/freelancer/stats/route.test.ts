import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireRole = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
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
    status: 'status',
    freelancerId: 'freelancerId',
    creditsUsed: 'creditsUsed',
    completedAt: 'completedAt',
  },
  freelancerProfiles: { userId: 'userId', rating: 'rating', completedTasks: 'completedTasks' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
  sum: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  inArray: vi.fn(),
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

// db.select().from(table) — no where/limit (resolves from .from())
function _chainableSelectFromOnly(result: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(result),
  }
}

// db.select().from(table).where(...) — no limit
function chainableSelectNoLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/freelancer/stats', () => {
  const mockRequest = {
    url: 'http://localhost/api/freelancer/stats',
    method: 'GET',
  }

  function setupAuth(userId = 'freelancer-1') {
    mockRequireRole.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireRole.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(mockRequest as never)
    expect(response.status).toBe(401)
  })

  it('returns stats for freelancer', async () => {
    setupAuth()
    // 6 parallel queries: profile, active, completed, pendingReview, earnings, monthly
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ rating: '4.5', completedTasksCount: 10 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 2 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 10 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 1 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ totalEarnings: 100 }]))
    mockDbSelect.mockReturnValueOnce(
      chainableSelectNoLimit([{ monthlyEarnings: 25, monthlyTasks: 3 }])
    )

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.activeTasks).toBe(2)
    expect(data.data.completedTasks).toBe(10)
    expect(data.data.pendingReview).toBe(1)
    expect(data.data.rating).toBe(4.5)
    expect(data.data.totalEarnings).toBe(100)
    expect(data.data.monthlyEarnings).toBe(25)
  })

  it('handles missing profile gracefully', async () => {
    setupAuth()
    // 6 parallel queries: profile (empty), active, completed, pendingReview, earnings, monthly
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 0 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 0 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ count: 0 }]))
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([{ totalEarnings: null }]))
    mockDbSelect.mockReturnValueOnce(
      chainableSelectNoLimit([{ monthlyEarnings: null, monthlyTasks: 0 }])
    )

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.rating).toBeNull()
    expect(data.data.totalEarnings).toBe(0)
  })
})
