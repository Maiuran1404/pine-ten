import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  audiences: { companyId: 'companyId' },
  users: { id: 'id', companyId: 'companyId' },
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

function chainableSelectNoLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/audiences', () => {
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

  it('returns empty array when user has no company', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: null }]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.audiences).toEqual([])
  })

  it('returns audiences sorted with primary first', async () => {
    setupAuth()
    // User lookup
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: 'company-1' }]))
    // Audiences lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelectNoLimit([
        { id: 'a-1', name: 'Young Professionals', isPrimary: false, confidence: 0.8 },
        { id: 'a-2', name: 'Enterprise', isPrimary: true, confidence: 0.9 },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.audiences).toHaveLength(2)
    // Primary should be first
    expect(data.data.audiences[0].name).toBe('Enterprise')
    expect(data.data.audiences[0].isPrimary).toBe(true)
  })
})
