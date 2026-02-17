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
  securityTestRuns: { id: 'id', startedAt: 'startedAt', createdAt: 'createdAt' },
  securityTestResults: { id: 'id', runId: 'runId', testId: 'testId', status: 'status' },
  securityTests: { id: 'id', severity: 'severity', category: 'category' },
  securitySnapshots: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(),
}))

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/security/execute/complete',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { POST } = await import('./route')

describe('POST /api/admin/security/execute/complete', () => {
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

  it('should complete a run and create snapshot', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockRun = {
      id: 'run-1',
      status: 'RUNNING',
      startedAt: new Date(Date.now() - 10000),
      createdAt: new Date(Date.now() - 15000),
    }

    const resultCounts = [
      { status: 'PASSED', count: 5 },
      { status: 'FAILED', count: 2 },
      { status: 'ERROR', count: 1 },
    ]

    const resultsWithSeverity = [
      { status: 'PASSED', severity: 'critical' },
      { status: 'PASSED', severity: 'high' },
      { status: 'FAILED', severity: 'medium' },
    ]

    const categoryResults = [
      { category: 'auth', status: 'PASSED' },
      { category: 'auth', status: 'FAILED' },
      { category: 'api', status: 'PASSED' },
    ]

    const failedResults = [{ severity: 'critical' }, { severity: 'high' }]

    let callIndex = 0
    mockSelect.mockImplementation(() => {
      const idx = callIndex++
      if (idx === 0) {
        // Get run
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRun]),
          }),
        }
      }
      if (idx === 1) {
        // Result counts grouped by status
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue(resultCounts),
            }),
          }),
        }
      }
      if (idx === 2) {
        // Results with severity
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(resultsWithSeverity),
            }),
          }),
        }
      }
      if (idx === 3) {
        // Category results
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(categoryResults),
            }),
          }),
        }
      }
      // Failed results
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(failedResults),
          }),
        }),
      }
    })

    const updatedRun = { ...mockRun, status: 'COMPLETED', completedAt: new Date() }
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedRun]),
        }),
      }),
    })

    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest({ runId: 'run-1' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveProperty('run')
    expect(data.data).toHaveProperty('summary')
    expect(data.data.summary).toHaveProperty('passed')
    expect(data.data.summary).toHaveProperty('failed')
    expect(data.data.summary).toHaveProperty('score')
  })
})
