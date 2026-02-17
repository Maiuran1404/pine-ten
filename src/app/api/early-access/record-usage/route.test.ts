import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockTxSelect = vi.fn()
const mockTxInsert = vi.fn()
const mockTxUpdate = vi.fn()
const mockWithTransaction = vi.fn()

vi.mock('@/db', () => ({
  earlyAccessCodes: {
    code: 'code',
    isActive: 'isActive',
    id: 'id',
    usedCount: 'usedCount',
  },
  earlyAccessCodeUsages: {},
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/lib/validations', () => ({
  validateEarlyAccessCodeSchema: {
    parse: vi.fn((val: unknown) => val),
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/early-access/record-usage',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/early-access/record-usage', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ code: 'ABC123' }))
    expect(response.status).toBe(401)
  })

  it('returns 400 when code is not found', async () => {
    setupAuth()
    mockWithTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }
      await cb(tx)
    })

    const response = await POST(makeRequest({ code: 'INVALID' }))
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error.message).toContain('Invalid invite code')
  })

  it('records usage and increments count on success', async () => {
    setupAuth()

    const mockInsertValues = vi.fn().mockResolvedValue(undefined)
    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    mockWithTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue([{ id: 'code-1', code: 'ABC123', isActive: true }]),
            }),
          }),
        }),
        insert: () => ({ values: mockInsertValues }),
        update: () => ({ set: mockUpdateSet }),
      }
      await cb(tx)
    })

    const response = await POST(makeRequest({ code: 'ABC123' }))
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.data.recorded).toBe(true)
    expect(mockInsertValues).toHaveBeenCalled()
    expect(mockUpdateSet).toHaveBeenCalled()
  })
})
