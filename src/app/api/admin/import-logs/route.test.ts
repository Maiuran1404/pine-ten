import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

const mockSelect = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  importLogs: {
    id: 'id',
    source: 'source',
    target: 'target',
    triggeredBy: 'triggeredBy',
    triggeredByEmail: 'triggeredByEmail',
    searchQuery: 'searchQuery',
    sourceUrl: 'sourceUrl',
    totalAttempted: 'totalAttempted',
    totalSuccessful: 'totalSuccessful',
    totalFailed: 'totalFailed',
    totalSkipped: 'totalSkipped',
    importedItems: 'importedItems',
    failedItems: 'failedItems',
    skippedItems: 'skippedItems',
    processingTimeMs: 'processingTimeMs',
    confidenceThreshold: 'confidenceThreshold',
    status: 'status',
    errorMessage: 'errorMessage',
    startedAt: 'startedAt',
    completedAt: 'completedAt',
    createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}))

const { GET, DELETE } = await import('./route')

function makeRequest(options: { url?: string; method?: string } = {}) {
  const url = options.url || 'http://localhost/api/admin/import-logs'
  return {
    url,
    method: options.method || 'GET',
    nextUrl: { searchParams: new URL(url).searchParams },
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

describe('GET /api/admin/import-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest()
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return logs with pagination and stats', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockLogs = [
      { id: 'log-1', source: 'bigged', target: 'deliverable_style', totalSuccessful: 10 },
    ]

    // First call: logs query (select -> from -> leftJoin -> where -> orderBy -> limit -> offset)
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockLogs),
                }),
              }),
            }),
          }),
        }),
      })
      // Second call: count query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      })
      // Third call: stats query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValue([
              { totalLogs: 1, totalImported: 10, totalFailed: 0, totalSkipped: 2 },
            ]),
        }),
      })

    const request = makeRequest()
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.logs).toHaveLength(1)
    expect(data.data.pagination).toBeDefined()
    expect(data.data.stats).toBeDefined()
  })
})

describe('DELETE /api/admin/import-logs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({
      url: 'http://localhost/api/admin/import-logs?id=log-1',
      method: 'DELETE',
    })
    const response = await DELETE(request as never)

    expect(response.status).toBe(401)
  })

  it('should return 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ url: 'http://localhost/api/admin/import-logs', method: 'DELETE' })
    const response = await DELETE(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('ID is required')
  })

  it('should delete import log by id', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest({
      url: 'http://localhost/api/admin/import-logs?id=log-1',
      method: 'DELETE',
    })
    const response = await DELETE(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.deleted).toBe(true)
  })
})
