import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  createBrandReferenceSchema: {
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
  brandReferences: {
    id: 'id',
    toneBucket: 'toneBucket',
    energyBucket: 'energyBucket',
    colorBucket: 'colorBucket',
    createdAt: 'createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeRequest(opts: { url?: string; body?: unknown } = {}) {
  return {
    url: opts.url || 'http://localhost/api/admin/brand-references',
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

describe('GET /api/admin/brand-references', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns brand references', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi
          .fn()
          .mockResolvedValue([{ id: 'ref-1', name: 'Corporate', toneBucket: 'professional' }]),
      }),
    })

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.references).toHaveLength(1)
  })
})

describe('POST /api/admin/brand-references', () => {
  it('creates a new brand reference', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'ref-new', name: 'Playful Brand' }]),
      }),
    })

    const response = await POST(
      makeRequest({
        body: {
          name: 'Playful Brand',
          imageUrl: 'https://img.test/playful.png',
          toneBucket: 'playful',
          energyBucket: 'high',
          densityBucket: 'minimal',
          colorBucket: 'vibrant',
          premiumBucket: 'standard',
          colorSamples: ['#FF0000'],
          visualStyles: ['cartoon'],
          industries: ['entertainment'],
          displayOrder: 1,
        },
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.reference.name).toBe('Playful Brand')
  })
})

describe('DELETE /api/admin/brand-references', () => {
  it('returns 400 when ID missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    const response = await DELETE(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Reference ID')
  })

  it('deletes a brand reference', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const response = await DELETE(
      makeRequest({ url: 'http://localhost/api/admin/brand-references?id=ref-1' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
