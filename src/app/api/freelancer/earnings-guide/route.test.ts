import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

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
  taskCategories: {
    id: 'id',
    name: 'name',
    slug: 'slug',
    description: 'description',
    baseCredits: 'baseCredits',
    isActive: 'isActive',
  },
}))

vi.mock('@/lib/config', () => ({
  config: {
    payouts: { creditValueUSD: 10 },
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET } = await import('./route')

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

describe('GET /api/freelancer/earnings-guide', () => {
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

  it('returns earnings guide for active categories', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelectNoLimit([
        {
          id: 'cat-1',
          name: 'Static Ads',
          slug: 'static-ads',
          description: 'Banner ads',
          baseCredits: 5,
        },
        {
          id: 'cat-2',
          name: 'Video',
          slug: 'video-motion-graphics',
          description: 'Motion',
          baseCredits: 10,
        },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.earningsGuide).toHaveLength(2)
    // Higher baseCredits should be first (sorted desc)
    expect(data.data.earningsGuide[0].slug).toBe('video-motion-graphics')
    expect(data.data.earningsGuide[0].baseCredits).toBe(10)
  })

  it('returns earnings ranges with correct multipliers', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelectNoLimit([
        { id: 'cat-1', name: 'Static Ads', slug: 'static-ads', description: 'Ads', baseCredits: 5 },
      ])
    )

    const response = await GET()
    const data = await response.json()

    const guide = data.data.earningsGuide[0]
    // creditValueUSD = 10, baseCredits = 5
    // simple: 5 * 1 * 10 = 50
    // moderate: 5 * 1.5 * 10 = 75
    // complex: 5 * 2 * 10 = 100
    // premium: 5 * 3 * 10 = 150
    expect(guide.earnings.simple).toBe(50)
    expect(guide.earnings.moderate).toBe(75)
    expect(guide.earnings.complex).toBe(100)
    expect(guide.earnings.premium).toBe(150)
    expect(guide.earnings.range.min).toBe(50)
    expect(guide.earnings.range.max).toBe(150)
  })

  it('includes notes in the response', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelectNoLimit([]))

    const response = await GET()
    const data = await response.json()

    expect(data.data.notes).toBeDefined()
    expect(data.data.notes.length).toBeGreaterThan(0)
  })
})
