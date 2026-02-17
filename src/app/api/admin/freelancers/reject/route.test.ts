import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/notifications', () => ({
  adminNotifications: { freelancerRejected: vi.fn().mockResolvedValue(undefined) },
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    freelancerRejected: vi.fn().mockReturnValue({ subject: 'Rejected', html: '<p>Rejected</p>' }),
  },
}))

vi.mock('@/lib/validations', () => ({
  adminFreelancerActionSchema: {
    parse: vi.fn((body: unknown) => body as { freelancerId: string; reason?: string }),
  },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
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
  freelancerProfiles: { id: 'id', userId: 'userId', status: 'status' },
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/freelancers/reject',
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

describe('POST /api/admin/freelancers/reject', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ freelancerId: 'fp-1' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 404 when freelancer not found', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })

    const response = await POST(makeRequest({ freelancerId: 'fp-1' }) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Freelancer')
  })

  it('successfully rejects freelancer', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                profile: { id: 'fp-1', userId: 'user-1', status: 'PENDING' },
                user: { id: 'user-1', name: 'Test Artist', email: 'artist@test.com' },
              },
            ]),
          }),
        }),
      }),
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'fp-1', reason: 'Portfolio does not meet standards' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
