import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    creditsPurchased: vi.fn().mockReturnValue({
      subject: 'Credits Received',
      html: '<p>Thank you for your purchase!</p>',
    }),
  },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockWithTransaction = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', credits: 'credits' },
  creditTransactions: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/credits',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/admin/credits', () => {
  const validBody = {
    userId: 'user-1',
    amount: 10,
    type: 'BONUS',
    description: 'Welcome bonus',
  }

  function setupAdmin() {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin User', email: 'admin@test.com' },
    })
  }

  function makeMockTx(selectResult: unknown[]) {
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue(selectResult),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }
  }

  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(403)
  })

  it('returns 404 when user not found', async () => {
    setupAdmin()
    const mockTx = makeMockTx([])
    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('returns 400 when amount would cause negative balance', async () => {
    setupAdmin()
    const mockTx = makeMockTx([{ credits: 5, email: 'test@test.com', name: 'Test User' }])
    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(
      makeRequest({ userId: 'user-1', amount: -10, type: 'ADJUSTMENT' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('negative credit balance')
  })

  it('successfully grants credits', async () => {
    setupAdmin()
    const mockTx = makeMockTx([{ credits: 20, email: 'test@test.com', name: 'Test User' }])
    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.previousCredits).toBe(20)
    expect(data.data.newCredits).toBe(30)
    expect(data.data.adjustment).toBe(10)
  })

  it('returns 400 for invalid schema input', async () => {
    setupAdmin()

    // Missing required fields
    const response = await POST(makeRequest({ userId: 'user-1' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid type enum', async () => {
    setupAdmin()

    const response = await POST(
      makeRequest({ userId: 'user-1', amount: 10, type: 'INVALID_TYPE' }) as never
    )
    expect(response.status).toBe(400)
  })
})
