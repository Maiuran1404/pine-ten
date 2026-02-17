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
  chatTestRuns: { batchId: 'batchId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

function makeRequest() {
  return {
    url: 'http://localhost/api/admin/chat-tests/batch-1',
    method: 'GET',
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET } = await import('./route')

describe('GET /api/admin/chat-tests/[batchId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const request = makeRequest()
    const response = await GET(request, { params: Promise.resolve({ batchId: 'batch-1' }) })

    expect(response.status).toBe(401)
  })

  it('should return batch details with runs', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockRuns = [
      { id: 'run-1', batchId: 'batch-1', scenarioName: 'Scenario 1', status: 'completed' },
      { id: 'run-2', batchId: 'batch-1', scenarioName: 'Scenario 2', status: 'pending' },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockRuns),
      }),
    })

    const request = makeRequest()
    const response = await GET(request, { params: Promise.resolve({ batchId: 'batch-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batchId).toBe('batch-1')
    expect(data.data.runs).toHaveLength(2)
  })

  it('should return 404 when batch not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const request = makeRequest()
    const response = await GET(request, { params: Promise.resolve({ batchId: 'nonexistent' }) })

    expect(response.status).toBe(404)
  })

  it('should call requireAdmin', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }),
    })

    const request = makeRequest()
    await GET(request, { params: Promise.resolve({ batchId: 'batch-1' }) })

    expect(mockRequireAdmin).toHaveBeenCalledOnce()
  })
})
