import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  adminNotifications: {
    freelancerApproved: vi.fn().mockResolvedValue(undefined),
    freelancerRejected: vi.fn().mockResolvedValue(undefined),
  },
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    freelancerRejected: vi.fn().mockReturnValue({ subject: 'Rejected', html: '<p>Rejected</p>' }),
  },
}))

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'http://localhost:3000' } },
}))

vi.mock('@/lib/audit', () => ({
  auditHelpers: { freelancerBulkAction: vi.fn() },
  actorFromUser: vi.fn().mockReturnValue({ id: 'admin-1', type: 'user' }),
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
  freelancerProfiles: { id: 'id', userId: 'userId', status: 'status', updatedAt: 'updatedAt' },
  users: { id: 'id', name: 'name', email: 'email', role: 'role', updatedAt: 'updatedAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  inArray: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/freelancers/bulk',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
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

describe('POST /api/admin/freelancers/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({ freelancerIds: ['f-1'], action: 'approve' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return validation error for empty freelancerIds', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ freelancerIds: [], action: 'approve' })
    const response = await POST(request as never)

    expect(response.status).toBe(400)
  })

  it('should return validation error for invalid action', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ freelancerIds: ['f-1'], action: 'invalid' })
    const response = await POST(request as never)

    expect(response.status).toBe(400)
  })

  it('should return 404 when no freelancers found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([]))

    const request = makeRequest({ freelancerIds: ['f-nonexistent'], action: 'approve' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('should approve freelancers and return success count', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(
      chainableSelect([
        {
          profile: { id: 'f-1', userId: 'u-1' },
          user: { id: 'u-1', name: 'Alice', email: 'alice@example.com' },
        },
      ])
    )
    mockUpdate.mockReturnValue(chainableUpdate())

    const request = makeRequest({ freelancerIds: ['f-1'], action: 'approve' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.action).toBe('approve')
    expect(data.data.total).toBe(1)
    // Update called for profiles status + user roles
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })
})
