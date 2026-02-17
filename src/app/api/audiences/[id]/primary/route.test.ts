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
  audiences: { id: 'id', companyId: 'companyId', isPrimary: 'isPrimary' },
  users: { id: 'id', companyId: 'companyId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { PUT } = await import('./route')

function makeRequest() {
  return {
    url: 'http://localhost/api/audiences/aud-1/primary',
    method: 'PUT',
    json: vi.fn().mockResolvedValue({}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/audiences/[id]/primary', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await PUT(makeRequest() as never, {
      params: Promise.resolve({ id: 'aud-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when user has no company', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ companyId: null }]),
        }),
      }),
    })

    const response = await PUT(makeRequest() as never, {
      params: Promise.resolve({ id: 'aud-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Company')
  })

  it('returns 404 when audience not found', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ companyId: 'company-1' }]),
        }),
      }),
    })
    // Reset all isPrimary
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    // Set new primary — returns empty (not found)
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await PUT(makeRequest() as never, {
      params: Promise.resolve({ id: 'aud-999' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Audience')
  })

  it('sets audience as primary', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ companyId: 'company-1' }]),
        }),
      }),
    })
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'aud-1', isPrimary: true }]),
        }),
      }),
    })

    const response = await PUT(makeRequest() as never, {
      params: Promise.resolve({ id: 'aud-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
