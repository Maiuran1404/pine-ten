import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  securityTests: { category: 'category', isActive: 'isActive', createdAt: 'createdAt' },
  securityTestRuns: {
    id: 'id',
    status: 'status',
    targetUrl: 'targetUrl',
    environment: 'environment',
    totalTests: 'totalTests',
    passedTests: 'passedTests',
    failedTests: 'failedTests',
    errorTests: 'errorTests',
    score: 'score',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
    durationMs: 'durationMs',
    createdAt: 'createdAt',
  },
  securitySnapshots: { createdAt: 'createdAt' },
  testSchedules: { isActive: 'isActive', createdAt: 'createdAt' },
  testUsers: { isActive: 'isActive' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  count: vi.fn(),
  gte: vi.fn(),
}))

const { GET } = await import('./route')

describe('GET /api/admin/security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return security overview dashboard data', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockSnapshot = {
      id: 'snap-1',
      overallScore: '85.00',
      createdAt: new Date().toISOString(),
    }
    const mockRun = {
      id: 'run-1',
      status: 'COMPLETED',
      targetUrl: 'https://example.com',
      environment: 'production',
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      errorTests: 0,
      score: '80',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 5000,
      createdAt: new Date().toISOString(),
    }

    // Each call to db.select() returns a different promise-based chain
    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const results = [
        [mockSnapshot], // latestSnapshot
        [mockRun], // recentRuns
        [], // activeSchedules
        [{ category: 'auth', count: 5 }], // testCounts
        [], // testUsers
        [{ count: 3 }], // last24hRuns
      ]
      const result = results[callIndex++] || []
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(result),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(result),
            }),
            limit: vi.fn().mockResolvedValue(result),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('summary')
    expect(data.data.summary).toHaveProperty('totalTests')
    expect(data.data.summary).toHaveProperty('runsLast24h')
  })

  it('should return null snapshot when none exists', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const results = [
        [], // no snapshot
        [], // no recentRuns
        [], // no activeSchedules
        [], // no testCounts
        [], // no testUsers
        [{ count: 0 }], // last24hRuns
      ]
      const result = results[callIndex++] || []
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(result),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(result),
            }),
            limit: vi.fn().mockResolvedValue(result),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.snapshot).toBeNull()
    expect(data.data.summary.totalTests).toBe(0)
    expect(data.data.summary.averagePassRate).toBeNull()
  })

  it('should calculate pass rate from recent runs', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockRuns = [
      {
        id: 'run-1',
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        errorTests: 0,
        score: '80',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'run-2',
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        errorTests: 0,
        score: '100',
        createdAt: new Date().toISOString(),
      },
    ]

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const results = [
        [], // snapshot
        mockRuns, // recentRuns
        [], // activeSchedules
        [{ category: 'auth', count: 10 }], // testCounts
        [], // testUsers
        [{ count: 2 }], // last24hRuns
      ]
      const result = results[callIndex++] || []
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(result),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(result),
            }),
            limit: vi.fn().mockResolvedValue(result),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary.averagePassRate).not.toBeNull()
  })

  it('should include test categories in response', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const testCounts = [
      { category: 'auth', count: 5 },
      { category: 'api', count: 3 },
    ]

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const results = [[], [], [], testCounts, [], [{ count: 0 }]]
      const result = results[callIndex++] || []
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(result),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(result),
            }),
            limit: vi.fn().mockResolvedValue(result),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.testCategories).toEqual(testCounts)
    expect(data.data.summary.totalTests).toBe(8)
  })

  it('should call requireAdmin', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const results = [[], [], [], [], [], [{ count: 0 }]]
      const result = results[callIndex++] || []
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(result),
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(result),
            }),
            limit: vi.fn().mockResolvedValue(result),
          }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }
    })

    await GET()
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
  })
})
