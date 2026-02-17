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
  generatedDesigns: {
    id: 'id',
    clientId: 'clientId',
    templateId: 'templateId',
    templateName: 'templateName',
    imageUrl: 'imageUrl',
    imageFormat: 'imageFormat',
    savedToAssets: 'savedToAssets',
    createdAt: 'createdAt',
  },
  orshotTemplates: {
    id: 'id',
    category: 'category',
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

function setupAuth(userId = 'user-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
  })
}

function chainableSelectWithJoin(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

describe('GET /api/orshot/designs', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns user designs', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithJoin([
        {
          id: 'design-1',
          templateId: 'tmpl-1',
          templateName: 'Social Post',
          imageUrl: 'https://img1.png',
          imageFormat: 'png',
          savedToAssets: false,
          createdAt: new Date('2025-01-01'),
          templateCategory: 'social',
        },
        {
          id: 'design-2',
          templateId: 'tmpl-2',
          templateName: 'Banner',
          imageUrl: 'https://img2.png',
          imageFormat: 'jpg',
          savedToAssets: true,
          createdAt: new Date('2025-01-02'),
          templateCategory: 'banner',
        },
      ])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.designs).toHaveLength(2)
    expect(data.data.designs[0].templateName).toBe('Social Post')
  })

  it('returns empty list when no designs exist', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelectWithJoin([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.designs).toHaveLength(0)
  })
})
