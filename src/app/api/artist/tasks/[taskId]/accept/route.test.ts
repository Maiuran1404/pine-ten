import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

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
  notify: vi.fn().mockResolvedValue(undefined),
}))

// Mock require-auth
const mockRequireRole = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

// DB mocks
const mockWithTransaction = vi.fn()
vi.mock('@/db', () => ({
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'id', status: 'status', offeredTo: 'offeredTo', offerExpiresAt: 'offerExpiresAt' },
  taskOffers: { taskId: 'taskId', artistId: 'artistId', response: 'response' },
  taskActivityLog: {},
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest() {
  return {
    url: 'http://localhost/api/artist/tasks/task-1/accept',
    method: 'POST',
    json: vi.fn().mockResolvedValue({}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function makeParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) }
}

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'artist-1',
    name: 'Test Artist',
    email: 'artist@test.com',
    role: 'FREELANCER',
    ...overrides,
  }
  mockRequireRole.mockResolvedValue({ user })
  return user
}

describe('POST /api/artist/tasks/[taskId]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireRole.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when user does not have FREELANCER role', async () => {
    mockRequireRole.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', 403)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })

  it('returns 404 when task not found', async () => {
    setupAuth()

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('nonexistent'))
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.message).toContain('Task not found')
  })

  it('returns 403 when task is not offered to this user', async () => {
    setupAuth({ id: 'artist-1' })

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([
              {
                id: 'task-1',
                status: 'OFFERED',
                offeredTo: 'other-artist',
                offerExpiresAt: null,
                clientId: 'client-1',
                title: 'A Task',
              },
            ]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error.message).toContain('not offered to you')
  })

  it('returns 400 when offer status is not OFFERED', async () => {
    setupAuth({ id: 'artist-1' })

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([
              {
                id: 'task-1',
                status: 'ASSIGNED',
                offeredTo: 'artist-1',
                offerExpiresAt: null,
                clientId: 'client-1',
                title: 'A Task',
              },
            ]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('no longer valid')
  })

  it('returns 400 when offer has expired', async () => {
    setupAuth({ id: 'artist-1' })

    const expiredDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([
              {
                id: 'task-1',
                status: 'OFFERED',
                offeredTo: 'artist-1',
                offerExpiresAt: expiredDate,
                clientId: 'client-1',
                title: 'A Task',
              },
            ]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('expired')
  })

  it('successfully accepts a task offer', async () => {
    setupAuth({ id: 'artist-1' })

    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    const updatedTask = {
      id: 'task-1',
      title: 'Accepted Task',
      status: 'ASSIGNED',
      clientId: 'client-1',
      freelancerId: 'artist-1',
    }

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([
              {
                id: 'task-1',
                status: 'OFFERED',
                offeredTo: 'artist-1',
                offerExpiresAt: futureDate,
                clientId: 'client-1',
                title: 'Accepted Task',
              },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTask]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }

    // Override select for the second call (client info)
    let selectCallCount = 0
    mockTx.select = vi.fn().mockImplementation(() => {
      selectCallCount++
      if (selectCallCount === 1) {
        // Task query
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi.fn().mockResolvedValue([
                {
                  id: 'task-1',
                  status: 'OFFERED',
                  offeredTo: 'artist-1',
                  offerExpiresAt: futureDate,
                  clientId: 'client-1',
                  title: 'Accepted Task',
                },
              ]),
            }),
          }),
        }
      }
      // Client query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ name: 'Client User', email: 'client@test.com' }]),
        }),
      }
    })

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('accepted successfully')
    expect(data.data.task.id).toBe('task-1')
    expect(data.data.task.status).toBe('ASSIGNED')
  })

  it('notification failure after accept is non-fatal', async () => {
    setupAuth({ id: 'artist-1' })

    const futureDate = new Date(Date.now() + 60 * 60 * 1000)

    const updatedTask = {
      id: 'task-1',
      title: 'Accepted Task',
      status: 'ASSIGNED',
      clientId: 'client-1',
      freelancerId: 'artist-1',
    }

    let selectCallCount = 0
    const mockTx = {
      select: vi.fn().mockImplementation(() => {
        selectCallCount++
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                for: vi.fn().mockResolvedValue([
                  {
                    id: 'task-1',
                    status: 'OFFERED',
                    offeredTo: 'artist-1',
                    offerExpiresAt: futureDate,
                    clientId: 'client-1',
                    title: 'Accepted Task',
                  },
                ]),
              }),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ name: 'Client', email: 'client@test.com' }]),
          }),
        }
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTask]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    // Make notification throw
    const { notify } = await import('@/lib/notifications')
    ;(notify as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Notification failed'))

    const response = await POST(makeRequest() as never, makeParams('task-1'))

    // Still returns 200 despite notification failure
    expect(response.status).toBe(200)
  })
})
