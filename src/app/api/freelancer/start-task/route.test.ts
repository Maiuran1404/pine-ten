import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/validations', () => ({
  claimTaskSchema: {
    parse: vi.fn((body: unknown) => body as { taskId: string }),
  },
}))

const mockRequireRole = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
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
  tasks: { id: 'id', freelancerId: 'freelancerId', status: 'status' },
  users: { id: 'id', name: 'name' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
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
    url: 'http://localhost/api/freelancer/start-task',
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

describe('POST /api/freelancer/start-task', () => {
  const validBody = { taskId: 'task-1' }

  function setupAuth(userId = 'freelancer-1') {
    mockRequireRole.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
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
    mockRequireRole.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns 404 when task not found or not assigned to user', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 400 when task is not in ASSIGNED status', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_PROGRESS',
        },
      ])
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('ASSIGNED')
  })

  it('successfully starts task and returns 200', async () => {
    setupAuth()
    // Task lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: 'task-1',
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'ASSIGNED',
        },
      ])
    )
    setupUpdate()
    // Freelancer name lookup for notification
    mockDbSelect.mockReturnValueOnce(chainableSelect([{ name: 'Test Artist' }]))

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
