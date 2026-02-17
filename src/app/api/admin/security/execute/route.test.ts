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
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  securityTestRuns: { id: 'id', status: 'status' },
  securityTestResults: { id: 'id', runId: 'runId', testId: 'testId', status: 'status' },
  securityTests: {
    id: 'id',
    name: 'name',
    category: 'category',
    testType: 'testType',
    severity: 'severity',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

// Mock global fetch for the security check functions
vi.stubGlobal('fetch', vi.fn())

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/security/execute',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { POST, GET, PUT } = await import('./route')

describe('POST /api/admin/security/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({ runId: 'run-1' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when runId missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should return 404 when run not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const request = makeRequest({ runId: 'nonexistent' })
    const response = await POST(request)

    expect(response.status).toBe(404)
  })

  it('should return 400 when run is already completed', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockResolvedValue([
            { id: 'run-1', status: 'COMPLETED', targetUrl: 'https://example.com' },
          ]),
      }),
    })

    const request = makeRequest({ runId: 'run-1' })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})

describe('GET /api/admin/security/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when runId missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/execute' })
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('should return execution status for a run', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockRun = {
      id: 'run-1',
      status: 'RUNNING',
      totalTests: 5,
      passedTests: 2,
      failedTests: 1,
      errorTests: 0,
      score: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    }

    const mockResults = [
      {
        result: { id: 'res-1', status: 'PASSED' },
        test: { name: 'Test 1', category: 'auth', severity: 'high' },
      },
      {
        result: { id: 'res-2', status: 'RUNNING' },
        test: { name: 'Test 2', category: 'api', severity: 'medium' },
      },
    ]

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      if (callIndex === 0) {
        callIndex++
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRun]),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockResults),
          }),
        }),
      }
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/execute?runId=run-1',
    })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveProperty('run')
    expect(data.data).toHaveProperty('progress')
    expect(data.data).toHaveProperty('results')
  })
})

describe('PUT /api/admin/security/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when resultId missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ status: 'PASSED' })
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })
})
