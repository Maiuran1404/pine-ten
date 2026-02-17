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
  adminNotifications: { taskAssigned: vi.fn().mockResolvedValue(undefined) },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
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
  tasks: { id: 'id', status: 'status', freelancerId: 'freelancerId', clientId: 'clientId' },
  freelancerProfiles: { userId: 'userId', status: 'status' },
  users: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
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
    url: 'http://localhost/api/freelancer/claim-task',
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

describe('POST /api/freelancer/claim-task', () => {
  const validBody = { taskId: '550e8400-e29b-41d4-a716-446655440000' }

  function setupAuth(user = { id: 'freelancer-1', name: 'Test Artist', email: 'artist@test.com' }) {
    mockRequireAuth.mockResolvedValue({ user })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns 403 when freelancer is not approved', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ status: 'PENDING' }]))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(403)
  })

  it('returns 400 when task is not available', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ status: 'APPROVED' }]))
    mockSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('no longer available')
  })

  it('successfully claims a task and returns 200', async () => {
    setupAuth()
    mockSelect.mockReturnValueOnce(chainableSelect([{ status: 'APPROVED' }]))
    mockSelect.mockReturnValueOnce(
      chainableSelect([
        { id: validBody.taskId, title: 'Test Task', clientId: 'client-1', creditsUsed: 5 },
      ])
    )
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'client-1', name: 'Test Client', companyId: null }])
    )

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('returns 400 for invalid taskId format', async () => {
    setupAuth()

    const response = await POST(makeRequest({ taskId: 'not-a-uuid' }) as never)
    expect(response.status).toBe(400)
  })
})
