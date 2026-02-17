import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  updateBrandSchema: {
    parse: vi.fn((body: unknown) => body),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockFindFirst = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
  companies: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, PUT } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/brand', () => {
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

  it('returns 404 when user has no company', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', company: null })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Brand')
  })

  it('returns brand/company data', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({
      id: 'user-1',
      company: {
        id: 'company-1',
        name: 'Test Brand',
        industry: 'SaaS',
        primaryColor: '#FF0000',
      },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.name).toBe('Test Brand')
    expect(data.data.industry).toBe('SaaS')
  })
})

describe('PUT /api/brand', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  function makeRequest(body: unknown) {
    return {
      url: 'http://localhost/api/brand',
      method: 'PUT',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 404 when user has no company', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', companyId: null })

    const response = await PUT(makeRequest({ name: 'Updated Brand' }) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Brand')
  })

  it('updates brand and returns updated data', async () => {
    setupAuth()
    mockFindFirst.mockResolvedValue({ id: 'user-1', companyId: 'company-1' })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: 'company-1', name: 'Updated Brand', industry: 'Tech' }]),
        }),
      }),
    })

    const response = await PUT(makeRequest({ name: 'Updated Brand', industry: 'Tech' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.name).toBe('Updated Brand')
  })
})
