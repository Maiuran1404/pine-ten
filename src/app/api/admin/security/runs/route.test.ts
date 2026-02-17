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
const mockDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  securityTestRuns: {
    id: 'id',
    status: 'status',
    createdAt: 'createdAt',
    scheduleId: 'scheduleId',
    testUserId: 'testUserId',
  },
  securityTestResults: { runId: 'runId', testId: 'testId', createdAt: 'createdAt' },
  securityTests: { id: 'id', isActive: 'isActive' },
  testUsers: { id: 'id', name: 'name', email: 'email' },
  testSchedules: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/security/runs',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST, PUT, DELETE } = await import('./route')

describe('GET /api/admin/security/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/runs' })
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should list all runs', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockRuns = [
      {
        run: { id: 'run-1', status: 'COMPLETED', targetUrl: 'https://example.com' },
        schedule: null,
        testUser: { name: 'Test User', email: 'test@example.com' },
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockRuns),
              }),
            }),
          }),
        }),
      }),
    })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/runs' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.runs).toHaveLength(1)
  })

  it('should get a specific run by id with results', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockRun = { id: 'run-1', status: 'COMPLETED', targetUrl: 'https://example.com' }
    const mockResults = [
      { result: { id: 'res-1', status: 'PASSED' }, test: { id: 'test-1', name: 'Auth test' } },
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
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockResults),
            }),
          }),
        }),
      }
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/runs?id=run-1',
    })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.run).toEqual(mockRun)
    expect(data.data.results).toHaveLength(1)
  })

  it('should return 404 when run not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/runs?id=nonexistent',
    })
    const response = await GET(request)

    expect(response.status).toBe(404)
  })
})

describe('POST /api/admin/security/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new test run', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const activeTests = [{ id: 'test-1', name: 'Auth test', category: 'auth', isActive: true }]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(activeTests),
      }),
    })

    const newRun = { id: 'run-new', status: 'PENDING', targetUrl: 'https://example.com' }
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newRun]),
      }),
    })

    const request = makeRequest({ targetUrl: 'https://example.com' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.run.id).toBe('run-new')
  })

  it('should return 400 when targetUrl missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/admin/security/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should cancel a running test run', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const runningRun = { id: 'run-1', status: 'RUNNING' }

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([runningRun]),
      }),
    })

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/runs?id=run-1',
    })
    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toBe('Run cancelled')
  })

  it('should return 400 when id missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/runs' })
    const response = await DELETE(request)

    expect(response.status).toBe(400)
  })
})
