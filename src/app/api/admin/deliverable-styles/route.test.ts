import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  createDeliverableStyleSchema: {
    parse: vi.fn((body: unknown) => body as Record<string, unknown>),
  },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  deliverableStyleReferences: {
    id: 'id',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    featuredOrder: 'featuredOrder',
    displayOrder: 'displayOrder',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeRequest(opts: { url?: string; body?: unknown } = {}) {
  return {
    url: opts.url || 'http://localhost/api/admin/deliverable-styles',
    method: 'POST',
    json: vi.fn().mockResolvedValue(opts.body || {}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/deliverable-styles', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns styles list', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi
          .fn()
          .mockResolvedValue([
            { id: 'style-1', name: 'Minimalist', deliverableType: 'logo', styleAxis: 'aesthetic' },
          ]),
      }),
    })

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.styles).toHaveLength(1)
  })
})

describe('POST /api/admin/deliverable-styles', () => {
  it('creates a new style', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: 'style-new', name: 'Bold', deliverableType: 'logo', styleAxis: 'aesthetic' },
          ]),
      }),
    })

    const response = await POST(
      makeRequest({
        body: {
          name: 'Bold',
          imageUrl: 'https://img.test/bold.png',
          deliverableType: 'logo',
          styleAxis: 'aesthetic',
          semanticTags: ['bold', 'strong'],
          featuredOrder: 1,
          displayOrder: 1,
        },
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.style.name).toBe('Bold')
  })
})

describe('DELETE /api/admin/deliverable-styles', () => {
  it('returns 400 when ID is missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    const response = await DELETE(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Style ID')
  })

  it('deletes a style', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const response = await DELETE(
      makeRequest({ url: 'http://localhost/api/admin/deliverable-styles?id=style-1' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
