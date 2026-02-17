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
  orshotTemplates: {
    id: 'id',
    name: 'name',
    description: 'description',
    category: 'category',
    previewImageUrl: 'previewImageUrl',
    outputFormat: 'outputFormat',
    isActive: 'isActive',
    createdAt: 'createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

function setupAuth() {
  mockRequireAuth.mockResolvedValue({
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  })
}

function chainableSelectWithOrderBy(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('GET /api/orshot/templates', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns active templates', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithOrderBy([
        {
          id: 'tmpl-1',
          name: 'Social Post',
          description: 'A social post template',
          category: 'social',
          previewImageUrl: 'https://preview.png',
          outputFormat: 'png',
        },
        {
          id: 'tmpl-2',
          name: 'Banner',
          description: 'A banner template',
          category: 'banner',
          previewImageUrl: 'https://preview2.png',
          outputFormat: 'jpg',
        },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.templates).toHaveLength(2)
    expect(data.data.templates[0].name).toBe('Social Post')
    expect(data.data.templates[1].name).toBe('Banner')
  })

  it('returns empty array when no templates exist', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelectWithOrderBy([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.templates).toHaveLength(0)
  })
})
