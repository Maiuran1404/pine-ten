import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockGenerateBrandedDesign = vi.fn()
const mockIsOrshotEnabled = vi.fn()
vi.mock('@/lib/orshot', () => ({
  generateBrandedDesign: (...args: unknown[]) => mockGenerateBrandedDesign(...args),
  isOrshotEnabled: (...args: unknown[]) => mockIsOrshotEnabled(...args),
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
  orshotTemplates: { id: 'id', isActive: 'isActive' },
  generatedDesigns: {},
  companies: { id: 'id' },
  users: { id: 'id', companyId: 'companyId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/orshot/generate',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth(userId = 'user-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
  })
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/orshot/generate', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ templateId: 'tmpl-1' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 when Orshot is not enabled', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(false)

    const response = await POST(makeRequest({ templateId: 'tmpl-1' }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('not configured')
  })

  it('returns 400 when templateId is missing', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(true)

    const response = await POST(makeRequest({}) as never)
    expect(response.status).toBe(400)
  })

  it('returns 404 when template is not found', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(true)
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest({ templateId: 'tmpl-missing' }) as never)
    expect(response.status).toBe(404)
  })

  it('returns 400 when template is inactive', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(true)
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'tmpl-1',
          name: 'Logo',
          isActive: false,
          orshotTemplateId: 'orshot-1',
          parameterMapping: {},
          outputFormat: 'png',
          category: 'logo',
        },
      ])
    )

    const response = await POST(makeRequest({ templateId: 'tmpl-1' }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('not available')
  })

  it('returns 400 when user has no company', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(true)
    // Template found
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'tmpl-1',
          name: 'Logo',
          isActive: true,
          orshotTemplateId: 'orshot-1',
          parameterMapping: {},
          outputFormat: 'png',
          category: 'logo',
        },
      ])
    )
    // User has no company
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: null }]))

    const response = await POST(makeRequest({ templateId: 'tmpl-1' }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('brand profile')
  })

  it('generates design successfully', async () => {
    setupAuth()
    mockIsOrshotEnabled.mockReturnValue(true)
    // Template found
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'tmpl-1',
          name: 'Social Post',
          isActive: true,
          orshotTemplateId: 'orshot-1',
          parameterMapping: { logo: 'logoUrl' },
          outputFormat: 'png',
          category: 'social',
        },
      ])
    )
    // User with company
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: 'company-1' }]))
    // Company data
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'company-1',
          name: 'Test Brand',
          logoUrl: 'https://logo.png',
          primaryColor: '#ff0000',
          secondaryColor: '#00ff00',
          accentColor: '#0000ff',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          primaryFont: 'Inter',
          secondaryFont: null,
          tagline: 'Test tagline',
        },
      ])
    )

    mockGenerateBrandedDesign.mockResolvedValue({
      success: true,
      imageUrl: 'https://generated-image.png',
      responseTime: 1500,
    })

    // Insert returning
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'design-1',
            createdAt: new Date('2025-01-01'),
          },
        ]),
      }),
    })

    const response = await POST(makeRequest({ templateId: 'tmpl-1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.design.id).toBe('design-1')
    expect(data.data.design.imageUrl).toBe('https://generated-image.png')
    expect(data.data.design.templateName).toBe('Social Post')
  })
})
