import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  notify: vi.fn().mockResolvedValue(undefined),
}))

// Mock validations
vi.mock('@/lib/validations', () => ({
  taskRevisionSchema: {
    parse: vi.fn((body: unknown) => body as { feedback: string }),
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
  tasks: { id: 'id', clientId: 'clientId', status: 'status' },
  taskMessages: {},
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/tasks/[id]/revision', () => {
  const taskId = 'task-123'
  const params = Promise.resolve({ id: taskId })

  function setupAuth(userId = 'client-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test Client', email: 'client@test.com' },
    })
  }

  function setupUpdate() {
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  function setupInsert() {
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
  }

  function makeRequest(body: unknown) {
    return {
      url: `http://localhost/api/tasks/${taskId}/revision`,
      method: 'POST',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ feedback: 'Please fix' }) as never, { params })
    expect(response.status).toBe(401)
  })

  it('returns 404 when task not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest({ feedback: 'Please fix' }) as never, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 403 when user is not the task owner', async () => {
    setupAuth('different-user')
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_REVIEW',
          revisionsUsed: 0,
          maxRevisions: 3,
        },
      ])
    )

    const response = await POST(makeRequest({ feedback: 'Please fix' }) as never, { params })
    expect(response.status).toBe(403)
  })

  it('returns 400 when task is not in IN_REVIEW status', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'PENDING',
          revisionsUsed: 0,
          maxRevisions: 3,
        },
      ])
    )

    const response = await POST(makeRequest({ feedback: 'Please fix' }) as never, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('in review')
  })

  it('returns 400 when max revisions reached', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_REVIEW',
          revisionsUsed: 3,
          maxRevisions: 3,
        },
      ])
    )

    const response = await POST(makeRequest({ feedback: 'Please fix' }) as never, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Maximum revisions')
  })

  it('successfully requests revision and returns 200', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_REVIEW',
          revisionsUsed: 1,
          maxRevisions: 3,
        },
      ])
    )
    setupUpdate()
    setupInsert()

    const response = await POST(makeRequest({ feedback: 'Please fix the colors' }) as never, {
      params,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.revisionsUsed).toBe(2)
    expect(data.data.maxRevisions).toBe(3)
  })
})
