import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  createCategorySchema: {
    parse: vi.fn((body: unknown) => body),
  },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  taskCategories: { id: 'id', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  desc: vi.fn(),
}))

const { GET, POST } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/categories', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns categories list', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([
          { id: 'cat-1', name: 'Logo Design', slug: 'logo-design' },
          { id: 'cat-2', name: 'Branding', slug: 'branding' },
        ]),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.categories).toHaveLength(2)
  })
})

describe('POST /api/admin/categories', () => {
  function makeRequest(body: unknown) {
    return {
      url: 'http://localhost/api/admin/categories',
      method: 'POST',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ name: 'Test' }) as never)
    expect(response.status).toBe(401)
  })

  it('creates a new category and returns 201', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'cat-new', name: 'Web Design', slug: 'web-design' }]),
      }),
    })

    const response = await POST(makeRequest({ name: 'Web Design', baseCredits: 5 }) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.category.name).toBe('Web Design')
  })
})
