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
const mockWithTransaction = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/db/schema', () => ({
  assignmentAlgorithmConfig: {
    id: 'id',
    version: 'version',
    isActive: 'isActive',
    publishedAt: 'publishedAt',
    updatedBy: 'updatedBy',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  ne: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/algorithm/publish',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

const mockConfig = {
  id: 'config-1',
  version: 2,
  name: 'Configuration v2',
  isActive: false,
  weights: {
    skillMatch: 30,
    timezoneFit: 15,
    experienceMatch: 25,
    workloadBalance: 15,
    performanceHistory: 15,
  },
  publishedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('POST /api/admin/algorithm/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest({ id: 'config-1' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await POST(makeRequest({ id: 'config-1' }) as never)
    expect(response.status).toBe(403)
  })

  it('returns 400 when configuration ID is missing', async () => {
    const response = await POST(makeRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Configuration ID is required')
  })

  it('returns 400 when id is null', async () => {
    const response = await POST(makeRequest({ id: null }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Configuration ID is required')
  })

  it('returns 400 when id is empty string', async () => {
    const response = await POST(makeRequest({ id: '' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Configuration ID is required')
  })

  it('returns 404 when configuration not found', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest({ id: 'nonexistent' }) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(data.error.message).toContain('Configuration')
  })

  it('returns 400 when configuration is already active', async () => {
    const activeConfig = { ...mockConfig, isActive: true }
    mockSelect.mockReturnValueOnce(chainableSelect([activeConfig]))

    const response = await POST(makeRequest({ id: 'config-1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('already active')
  })

  it('publishes configuration successfully using transaction', async () => {
    // Config found and not active
    mockSelect.mockReturnValueOnce(chainableSelect([mockConfig]))

    // Transaction executes successfully
    const mockTxUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    mockWithTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ update: mockTxUpdate })
    })

    const response = await POST(makeRequest({ id: 'config-1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('v2')
    expect(data.data.message).toContain('active')
    expect(data.data.configId).toBe('config-1')
    // Should call update twice: once to deactivate all, once to activate the selected
    expect(mockTxUpdate).toHaveBeenCalledTimes(2)
  })

  it('uses transaction for atomicity', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([mockConfig]))

    const transactionCalls: string[] = []
    const mockTxUpdate = vi.fn().mockImplementation(() => {
      transactionCalls.push('update')
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }
    })

    mockWithTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ update: mockTxUpdate })
    })

    await POST(makeRequest({ id: 'config-1' }) as never)

    // Verify withTransaction was called (ensures atomicity)
    expect(mockWithTransaction).toHaveBeenCalledTimes(1)
    // Both updates happen within the transaction
    expect(transactionCalls).toEqual(['update', 'update'])
  })

  it('rolls back transaction on error', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([mockConfig]))

    // Transaction fails
    mockWithTransaction.mockRejectedValue(new Error('Database connection lost'))

    const response = await POST(makeRequest({ id: 'config-1' }) as never)

    // Should return 500 internal error since the transaction failed
    expect(response.status).toBe(500)
  })

  it('deactivates other configs before activating the selected one', async () => {
    mockSelect.mockReturnValueOnce(chainableSelect([mockConfig]))

    const updateCallOrder: Array<{ operation: string }> = []
    let updateCallIndex = 0
    const mockTxUpdate = vi.fn().mockImplementation(() => {
      const _currentCall = updateCallIndex++
      return {
        set: vi.fn().mockImplementation((values: Record<string, unknown>) => {
          if (values.isActive === false) {
            updateCallOrder.push({ operation: 'deactivate-others' })
          } else if (values.isActive === true) {
            updateCallOrder.push({ operation: 'activate-selected' })
          }
          return {
            where: vi.fn().mockResolvedValue(undefined),
          }
        }),
      }
    })

    mockWithTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ update: mockTxUpdate })
    })

    const response = await POST(makeRequest({ id: 'config-1' }) as never)

    expect(response.status).toBe(200)
    // First deactivate others, then activate selected
    expect(updateCallOrder[0].operation).toBe('deactivate-others')
    expect(updateCallOrder[1].operation).toBe('activate-selected')
  })
})
