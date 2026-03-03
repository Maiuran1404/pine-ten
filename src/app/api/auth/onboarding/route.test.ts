import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'https://crafted.test' },
    rateLimits: { auth: { maxRequests: 20, windowMs: 60000 } },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: (_handler: (...args: unknown[]) => unknown) => _handler,
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false }),
}))

vi.mock('@/lib/notifications', () => ({
  adminNotifications: {
    newClientSignup: vi.fn().mockResolvedValue(undefined),
    newFreelancerApplication: vi.fn().mockResolvedValue(undefined),
  },
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    welcomeClient: vi.fn().mockReturnValue({ subject: 'Welcome', html: '<p>Welcome</p>' }),
  },
  notifyAdminWhatsApp: vi.fn().mockResolvedValue(undefined),
  adminWhatsAppTemplates: { newUserSignup: vi.fn().mockReturnValue('New signup') },
}))

vi.mock('@/lib/ai/infer-audiences', () => ({
  inferAudiencesFromBrand: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/validations', () => ({
  onboardingRequestSchema: {
    parse: vi.fn((body: unknown) => body),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', role: 'role', onboardingCompleted: 'onboardingCompleted' },
  freelancerProfiles: {},
  companies: {},
  audiences: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/auth/onboarding',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/onboarding', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  function setupUpdate() {
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({}) as never)
    expect(response.status).toBe(401)
  })

  it('returns 404 when user not found in DB', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const body = { type: 'client', data: { brand: { name: 'Test' }, hasWebsite: false } }
    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('User')
  })

  it('returns 403 when onboarding already completed', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ role: 'CLIENT', onboardingCompleted: true }])
    )

    const body = { type: 'client', data: { brand: { name: 'Test' }, hasWebsite: false } }
    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error.message).toContain('already completed')
  })

  it('returns 403 when user is ADMIN', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ role: 'ADMIN', onboardingCompleted: false }])
    )

    const body = { type: 'client', data: { brand: { name: 'Test' }, hasWebsite: false } }
    const response = await POST(makeRequest(body) as never)
    expect(response.status).toBe(403)
  })

  it('successfully onboards a freelancer', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ role: 'FREELANCER', onboardingCompleted: false }])
    )
    setupUpdate()
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })

    const body = {
      type: 'freelancer',
      data: {
        skills: ['logo', 'branding'],
        specializations: ['minimalist'],
        portfolioUrls: ['https://portfolio.test'],
        bio: 'Creative designer',
      },
    }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('successfully onboards a client with brand', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ role: 'CLIENT', onboardingCompleted: false }])
    )
    // Company insert
    mockDbInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'company-1', name: 'Test Brand' }]),
      }),
    })
    // Audiences insert (empty — no audiences)
    setupUpdate()

    const body = {
      type: 'client',
      data: {
        brand: { name: 'Test Brand', industry: 'SaaS' },
        hasWebsite: false,
      },
    }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.companyId).toBe('company-1')
  })

  it('accepts creativeFocus as an array of strings', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ role: 'CLIENT', onboardingCompleted: false }])
    )
    // Company insert
    mockDbInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'company-2', name: 'Focus Brand' }]),
      }),
    })
    // Audiences insert (empty)
    setupUpdate()

    const body = {
      type: 'client',
      data: {
        brand: {
          name: 'Focus Brand',
          industry: 'Marketing',
          creativeFocus: ['social-media', 'branding', 'video-production'],
        },
        hasWebsite: true,
      },
    }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.companyId).toBe('company-2')
  })

  it('rejects creativeFocus when given as a plain string instead of array', async () => {
    // Use the real (un-mocked) schema to validate that a plain string is rejected
    const actual = await vi.importActual<typeof import('@/lib/validations')>('@/lib/validations')

    const result = actual.onboardingRequestSchema.safeParse({
      type: 'client',
      data: {
        brand: {
          name: 'Bad Focus',
          creativeFocus: 'social-media', // string instead of array — should fail
        },
        hasWebsite: false,
      },
    })

    expect(result.success).toBe(false)
  })
})
