import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', credits: 'credits' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/user/credits', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns 404 when user not found', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('returns credits on success', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ credits: 42 }]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.credits).toBe(42)
  })

  it('returns zero credits when user has none', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ credits: 0 }]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.credits).toBe(0)
  })
})
