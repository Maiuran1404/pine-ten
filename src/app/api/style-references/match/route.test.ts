import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
vi.mock('@/db', () => ({
  db: {
    query: {
      users: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      deliverableStyleReferences: { findMany: (...args: unknown[]) => mockFindMany(...args) },
    },
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
  deliverableStyleReferences: {
    isActive: 'isActive',
    $inferSelect: {},
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET } = await import('./route')

function makeGetRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params)
  return {
    url: `http://localhost/api/style-references/match?${searchParams.toString()}`,
    method: 'GET',
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
    nextUrl: { searchParams },
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/style-references/match', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeGetRequest())
    expect(response.status).toBe(401)
  })

  it('returns grouped references when user has no company', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', company: null })
    mockFindMany.mockResolvedValue([
      {
        id: 'style-1',
        name: 'Modern Post',
        deliverableType: 'instagram_post',
        isActive: true,
        colorSamples: ['#FF0000'],
        colorTemperature: 'warm',
      },
    ])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.matchMethod).toBe('content_category')
  })

  it('returns empty data when no references exist', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', company: null })
    mockFindMany.mockResolvedValue([])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.data).toEqual([])
  })

  it('returns brand-matched references when user has company with colors', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      company: {
        primaryColor: '#FF5500',
        secondaryColor: '#0055FF',
        accentColor: null,
        brandColors: [],
      },
    })
    mockFindMany.mockResolvedValue([
      {
        id: 'style-1',
        name: 'Warm Style',
        deliverableType: 'instagram_post',
        isActive: true,
        colorSamples: ['#FF5510'],
        colorTemperature: 'warm',
      },
      {
        id: 'style-2',
        name: 'Cool Style',
        deliverableType: 'static_ad',
        isActive: true,
        colorSamples: ['#00FF00'],
        colorTemperature: 'cool',
      },
    ])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.matchMethod).toBe('content_category')
    expect(data.data.brandColors).toBeDefined()
    expect(data.data.brandColorFamilies).toBeDefined()
  })

  it('respects limit parameter', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', company: null })

    const manyRefs = Array.from({ length: 30 }, (_, i) => ({
      id: `style-${i}`,
      name: `Style ${i}`,
      deliverableType: 'instagram_post',
      isActive: true,
      colorSamples: ['#FF0000'],
      colorTemperature: 'warm',
    }))
    mockFindMany.mockResolvedValue(manyRefs)

    const response = await GET(makeGetRequest({ limit: '5' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.data.length).toBeLessThanOrEqual(5)
  })
})
