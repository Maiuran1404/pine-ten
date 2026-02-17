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
  brandReferences: {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'imageUrl',
    toneBucket: 'toneBucket',
    energyBucket: 'energyBucket',
    densityBucket: 'densityBucket',
    colorBucket: 'colorBucket',
    colorSamples: 'colorSamples',
    visualStyles: 'visualStyles',
    industries: 'industries',
    displayOrder: 'displayOrder',
    usageCount: 'usageCount',
    isActive: 'isActive',
  },
}))

vi.mock('@/lib/constants/reference-libraries', () => ({
  getToneBucket: vi.fn().mockReturnValue('playful'),
  getEnergyBucket: vi.fn().mockReturnValue('energetic'),
  getDensityBucket: vi.fn().mockReturnValue('balanced'),
  getColorBucket: vi.fn().mockReturnValue('warm'),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn().mockReturnValue({ as: vi.fn() }),
  desc: vi.fn(),
  and: vi.fn(),
}))

const { POST, GET } = await import('./route')

function makeRequest(body?: unknown, options: { url?: string; method?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/brand-references/match',
    method: options.method || 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
    nextUrl: { searchParams: new URLSearchParams() },
  } as never
}

function makeGetRequest(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params)
  return {
    url: `http://localhost/api/brand-references/match?${searchParams.toString()}`,
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

describe('POST /api/brand-references/match', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ signalTone: 50 }))
    expect(response.status).toBe(401)
  })

  it('returns matched references on success', async () => {
    setupAuth()

    const mockRefs = [
      { id: 'ref-1', name: 'Brand A', score: 8 },
      { id: 'ref-2', name: 'Brand B', score: 5 },
    ]

    // References query
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockRefs),
            }),
          }),
        }),
      }),
    })

    // Count query
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 10 }]),
      }),
    })

    const response = await POST(makeRequest({ signalTone: 70, signalEnergy: 80 }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.references).toHaveLength(2)
    expect(data.data.total).toBe(10)
    expect(data.data.buckets).toBeDefined()
  })

  it('returns empty array when no matches found', async () => {
    setupAuth()

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    const response = await POST(makeRequest({}))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.references).toEqual([])
    expect(data.data.total).toBe(0)
  })
})

describe('GET /api/brand-references/match', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeGetRequest())
    expect(response.status).toBe(401)
  })

  it('returns references filtered by bucket params', async () => {
    setupAuth()

    const mockRefs = [{ id: 'ref-1', name: 'Brand A' }]

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockRefs),
            }),
          }),
        }),
      }),
    })

    const response = await GET(makeGetRequest({ toneBucket: 'playful', limit: '5' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.references).toHaveLength(1)
  })
})
