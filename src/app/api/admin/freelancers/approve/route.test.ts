import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  safeNotify: vi.fn().mockResolvedValue(undefined),
  adminNotifications: { freelancerApproved: vi.fn().mockResolvedValue(undefined) },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
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
    url: 'http://localhost/api/admin/freelancers/approve',
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

describe('POST /api/admin/freelancers/approve', () => {
  const validFreelancerId = '550e8400-e29b-41d4-a716-446655440000'
  const validBody = { freelancerId: validFreelancerId }

  function setupAdmin() {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin User', email: 'admin@test.com' },
    })
  }

  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(403)
  })

  it('returns 404 when freelancer not found', async () => {
    setupAdmin()
    // The route uses select().from().innerJoin().where().limit()
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Freelancer')
  })

  it('returns 400 for invalid freelancerId format', async () => {
    setupAdmin()

    const response = await POST(makeRequest({ freelancerId: 'not-a-uuid' }) as never)
    expect(response.status).toBe(400)
  })

  it('successfully approves freelancer', async () => {
    setupAdmin()

    // Mock select with innerJoin chain for profile + user lookup
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                profile: {
                  id: validFreelancerId,
                  userId: 'freelancer-user-1',
                  status: 'PENDING',
                  skills: ['design'],
                  portfolioUrls: ['https://example.com'],
                },
                user: {
                  id: 'freelancer-user-1',
                  name: 'Test Freelancer',
                  email: 'freelancer@test.com',
                },
              },
            ]),
          }),
        }),
      }),
    })

    // Mock both update calls (profile + user role in Promise.all)
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    // Two update calls: one for freelancerProfiles, one for users
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})
