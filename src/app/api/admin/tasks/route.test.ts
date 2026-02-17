import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
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
  tasks: {
    id: 'id',
    title: 'title',
    clientId: 'clientId',
    freelancerId: 'freelancerId',
    createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name' },
  taskFiles: { taskId: 'taskId' },
  taskMessages: { taskId: 'taskId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  inArray: vi.fn(),
}))

vi.mock('drizzle-orm/pg-core', () => ({
  alias: vi.fn((_table: unknown, aliasName: string) => ({ _alias: aliasName })),
}))

const { GET, DELETE } = await import('./route')

function makeRequest(opts: { url?: string; body?: unknown; method?: string } = {}) {
  return {
    url: opts.url || 'http://localhost/api/admin/tasks?limit=20&offset=0',
    method: opts.method || 'GET',
    json: vi.fn().mockResolvedValue(opts.body || {}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/tasks', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns task list with joins', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([
                  {
                    id: 'task-1',
                    title: 'Logo Design',
                    status: 'IN_PROGRESS',
                    clientName: 'Client A',
                    freelancerName: 'Designer B',
                    createdAt: new Date(),
                  },
                ]),
              }),
            }),
          }),
        }),
      }),
    })

    const response = await GET(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(1)
    expect(data.data.tasks[0].title).toBe('Logo Design')
  })
})

describe('DELETE /api/admin/tasks', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await DELETE(
      makeRequest({ method: 'DELETE', body: { taskIds: ['task-1'] } }) as never
    )
    expect(response.status).toBe(401)
  })

  it('deletes tasks and related records', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // taskFiles delete
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    // taskMessages delete
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    // tasks delete with returning
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 'task-1', title: 'Logo Design' },
          { id: 'task-2', title: 'Banner Design' },
        ]),
      }),
    })

    const response = await DELETE(
      makeRequest({ method: 'DELETE', body: { taskIds: ['task-1', 'task-2'] } }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.deleted).toBe(2)
    expect(data.data.tasks).toHaveLength(2)
  })

  it('returns 404 when no tasks matched', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    })

    const response = await DELETE(
      makeRequest({ method: 'DELETE', body: { taskIds: ['nonexistent'] } }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Tasks')
  })
})
