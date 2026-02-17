import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  audiences: { id: 'id', companyId: 'companyId' },
  users: { id: 'id', companyId: 'companyId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { DELETE } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableDelete(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function makeRequest(url = 'http://localhost/api/audiences/aud-1') {
  return {
    url,
    method: 'DELETE',
    json: vi.fn().mockResolvedValue({}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/audiences/[id]', () => {
  const params = Promise.resolve({ id: 'aud-1' })

  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(401)
  })

  it('returns 404 when user has no company', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: null }]))

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error.message).toContain('Company')
  })

  it('returns 404 when audience belongs to different company', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: 'comp-1' }]))
    mockDbDelete.mockReturnValueOnce(chainableDelete([]))

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error.message).toContain('Audience')
  })

  it('returns 200 on successful delete', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ companyId: 'comp-1' }]))
    mockDbDelete.mockReturnValueOnce(chainableDelete([{ id: 'aud-1' }]))

    const response = await DELETE(makeRequest(), { params })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
