import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'https://crafted.test' },
    rateLimits: { auth: { maxRequests: 20, windowMs: 60000 } },
  },
}))

// Mock rate limiting to passthrough
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: (_handler: (...args: unknown[]) => unknown) => _handler,
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}))

// Hoisted mock references via wrapper pattern
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', role: 'role' },
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
    url: 'http://localhost/api/auth/set-role',
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

describe('POST /api/auth/set-role', () => {
  const validBody = { role: 'FREELANCER' }

  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid role value outside schema enum', async () => {
    setupAuth()

    const response = await POST(makeRequest({ role: 'ADMIN' }) as never)
    const data = await response.json()

    // 'ADMIN' is not in the setRoleSchema enum, so Zod validation fails
    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Validation failed')
  })

  it('returns 400 for role CLIENT (only FREELANCER allowed)', async () => {
    setupAuth()

    const response = await POST(makeRequest({ role: 'CLIENT' }) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Invalid role')
  })

  it('returns 404 when user not found in DB', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('successfully sets role to FREELANCER when current role is CLIENT', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ role: 'CLIENT' }]))
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('does not update if user is already FREELANCER', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ role: 'FREELANCER' }]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
