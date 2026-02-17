import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    clientId: 'clientId',
    freelancerId: 'freelancerId',
    status: 'status',
    updatedAt: 'updatedAt',
  },
  users: { id: 'id', name: 'name', email: 'email', image: 'image' },
  taskFiles: { taskId: 'taskId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  inArray: vi.fn(),
}))

vi.mock('drizzle-orm/pg-core', () => ({
  alias: vi.fn((_table: unknown, aliasName: string) => ({ _alias: aliasName })),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/verify', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns pending tasks with deliverable counts', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // Tasks with joins
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: 'task-1',
                  title: 'Logo Design',
                  status: 'PENDING_ADMIN_REVIEW',
                  client: { name: 'Client A', email: 'a@test.com', image: null },
                  freelancer: { name: 'Artist B', email: 'b@test.com', image: null },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }),
      }),
    })
    // Deliverable counts
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ taskId: 'task-1', count: 3 }]),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(1)
    expect(data.data.tasks[0].deliverableCount).toBe(3)
    expect(data.data.tasks[0].client.name).toBe('Client A')
  })

  it('returns empty tasks list', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(0)
  })
})
