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
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', credits: 'credits' },
  creditTransactions: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

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

  function setupUpdate() {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  function setupInsert() {
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
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
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('returns 400 when amount would cause negative balance', async () => {
    setupAdmin()
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'user-1', name: 'Test User', email: 'test@test.com', credits: 5 }])
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
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'user-1', name: 'Test User', email: 'test@test.com', credits: 20 }])
    )
    setupUpdate()
    setupInsert()

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.previousCredits).toBe(20)
    expect(data.data.newCredits).toBe(30)
    expect(data.data.adjustment).toBe(10)
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
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
