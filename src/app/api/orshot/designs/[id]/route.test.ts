import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
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
    modificationsUsed: 'modificationsUsed',
    savedToAssets: 'savedToAssets',
    createdAt: 'createdAt',
  },
  orshotTemplates: {
    id: 'id',
    category: 'category',
    description: 'description',
  },
  companies: {
    id: 'id',
    brandAssets: 'brandAssets',
  },
  users: {
    id: 'id',
    companyId: 'companyId',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { GET, POST } = await import('./route')

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/orshot/designs/design-1',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth(userId = 'user-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
  })
}

function chainableSelectWithJoinAndLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableUpdate() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/orshot/designs/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest() as never, makeParams('design-1'))
    expect(response.status).toBe(401)
  })

  it('returns 404 when design not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelectWithJoinAndLimit([]))

    const response = await GET(makeRequest() as never, makeParams('design-missing'))
    expect(response.status).toBe(404)
  })

  it('returns single design', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithJoinAndLimit([
        {
          id: 'design-1',
          clientId: 'user-1',
          templateId: 'tmpl-1',
          templateName: 'Social Post',
          imageUrl: 'https://img.png',
          imageFormat: 'png',
          modificationsUsed: { name: 'Test' },
          savedToAssets: false,
          createdAt: new Date('2025-01-01'),
          templateCategory: 'social',
          templateDescription: 'A social template',
        },
      ])
    )

    const response = await GET(makeRequest() as never, makeParams('design-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.design.id).toBe('design-1')
    expect(data.data.design.templateName).toBe('Social Post')
  })
})

describe('POST /api/orshot/designs/[id]', () => {
  it('returns 404 when design not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest({}) as never, makeParams('design-missing'))
    expect(response.status).toBe(404)
  })

  it('saves design to brand assets successfully', async () => {
    setupAuth()
    // Design exists
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'design-1',
          clientId: 'user-1',
          imageUrl: 'https://img.png',
          savedToAssets: false,
        },
      ])
    )
    // User with company
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: 'company-1' }]))
    // Company brand assets
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ brandAssets: { images: [], documents: [] } }])
    )
    // Two updates
    mockDbUpdate.mockReturnValueOnce(chainableUpdate())
    mockDbUpdate.mockReturnValueOnce(chainableUpdate())

    const response = await POST(makeRequest({}) as never, makeParams('design-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('returns 400 when design is already saved', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'design-1',
          clientId: 'user-1',
          imageUrl: 'https://img.png',
          savedToAssets: true,
        },
      ])
    )

    const response = await POST(makeRequest({}) as never, makeParams('design-1'))
    expect(response.status).toBe(400)
  })
})
