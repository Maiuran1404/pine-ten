import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  updateFreelancerProfileSchema: {
    parse: vi.fn((body: unknown) => body),
  },
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
  freelancerProfiles: { userId: 'userId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, PATCH } = await import('./route')

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

describe('GET /api/freelancer/profile', () => {
  const mockRequest = {
    url: 'http://localhost/api/freelancer/profile',
    method: 'GET',
  }

  function setupAuth(userId = 'freelancer-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(mockRequest as never)
    expect(response.status).toBe(401)
  })

  it('returns NOT_FOUND status when no profile exists', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('NOT_FOUND')
  })

  it('returns profile data when profile exists', async () => {
    setupAuth()
    const profile = {
      userId: 'freelancer-1',
      bio: 'Creative designer',
      skills: ['logo', 'branding'],
      status: 'APPROVED',
    }
    mockDbSelect.mockReturnValueOnce(chainableSelect([profile]))

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.bio).toBe('Creative designer')
    expect(data.data.skills).toEqual(['logo', 'branding'])
  })
})

describe('PATCH /api/freelancer/profile', () => {
  function setupAuth(userId = 'freelancer-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
    })
  }

  function makeRequest(body: unknown) {
    return {
      url: 'http://localhost/api/freelancer/profile',
      method: 'PATCH',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await PATCH(makeRequest({ bio: 'New bio' }) as never)
    expect(response.status).toBe(401)
  })

  it('successfully updates profile', async () => {
    setupAuth()
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await PATCH(
      makeRequest({ bio: 'Updated bio', skills: ['illustration'] }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
