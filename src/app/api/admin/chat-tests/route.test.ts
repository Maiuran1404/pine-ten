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
const mockInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  chatTestRuns: {
    id: 'id',
    batchId: 'batchId',
    triggeredBy: 'triggeredBy',
    status: 'status',
    scenarioName: 'scenarioName',
    reachedReview: 'reachedReview',
    totalTurns: 'totalTurns',
    durationMs: 'durationMs',
    createdAt: 'createdAt',
  },
}))

vi.mock('@/lib/ai/chat-test-scenarios', () => ({
  chatTestScenarios: Array.from({ length: 10 }, (_, i) => ({
    name: `Scenario ${i + 1}`,
    companyName: `Company ${i + 1}`,
    industry: 'tech',
    platform: 'web',
    contentType: 'social',
    intent: 'generate',
    openingMessage: `Hello from scenario ${i + 1}`,
  })),
}))

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
  sql: vi.fn().mockReturnValue({ as: vi.fn() }),
}))

vi.mock('zod', async () => {
  const actual = await vi.importActual('zod')
  return actual
})

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/chat-tests',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST } = await import('./route')

describe('GET /api/admin/chat-tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should list all batches with summary stats', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockBatches = [
      {
        batchId: 'batch-1',
        triggeredBy: 'admin-1',
        createdAt: new Date().toISOString(),
        totalRuns: 10,
        completedRuns: 8,
        failedRuns: 1,
        runningRuns: 0,
        pendingRuns: 1,
        reachedReviewCount: 7,
        avgTurns: 5.2,
        avgDurationMs: 12000,
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockBatches),
          }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].batchId).toBe('batch-1')
  })
})

describe('POST /api/admin/chat-tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const request = makeRequest({ count: 5 })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should create a batch of chat test runs', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const insertedRuns = Array.from({ length: 5 }, (_, i) => ({
      id: `run-${i}`,
      scenarioName: `Scenario ${i + 1}`,
      status: 'pending',
    }))

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(insertedRuns),
      }),
    })

    const request = makeRequest({ count: 5 })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.runs).toHaveLength(5)
    expect(data.data.batchId).toBeDefined()
  })

  it('should default to 10 scenarios when count not provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const insertedRuns = Array.from({ length: 10 }, (_, i) => ({
      id: `run-${i}`,
      scenarioName: `Scenario ${i + 1}`,
      status: 'pending',
    }))

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(insertedRuns),
      }),
    })

    const request = makeRequest({})
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.runs).toHaveLength(10)
  })

  it('should call requireAdmin before creating batch', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })

    const request = makeRequest({ count: 1 })
    await POST(request)

    expect(mockRequireAdmin).toHaveBeenCalledOnce()
  })
})
