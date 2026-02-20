import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    role: 'role',
    credits: 'credits',
    onboardingCompleted: 'onboardingCompleted',
    createdAt: 'createdAt',
  },
  tasks: { clientId: 'clientId', status: 'status' },
  creditTransactions: { userId: 'userId', type: 'type', amount: 'amount' },
  sessions: { userId: 'userId', updatedAt: 'updatedAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(),
  sum: vi.fn(),
  max: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  ilike: vi.fn(),
}))

const { GET } = await import('./route')

function createRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/clients')
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return new NextRequest(url)
}

/** Set up all 6 mock DB calls: count, clients, taskCounts, completedTasks, creditsPurchased, lastActive */
function setupDbMocks(opts: {
  total: number
  clients: Array<{
    id: string
    name: string
    email: string
    credits: number
    createdAt: Date
  }>
  taskCounts?: Array<{ clientId: string; count: number }>
  completedTasks?: Array<{ clientId: string; count: number }>
  creditsPurchased?: Array<{ userId: string; total: number }>
  lastActive?: Array<{ userId: string; lastActiveAt: Date | null }>
}) {
  // 1. Count query: select -> from -> where -> [{ total }]
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total: opts.total }]),
    }),
  })

  // 2. Clients query: select -> from -> where -> limit -> offset -> [clients]
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(opts.clients),
        }),
      }),
    }),
  })

  // 3. Task counts: select -> from -> groupBy
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      groupBy: vi.fn().mockResolvedValue(opts.taskCounts ?? []),
    }),
  })

  // 4. Completed task counts: select -> from -> where -> groupBy
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockResolvedValue(opts.completedTasks ?? []),
      }),
    }),
  })

  // 5. Credits purchased: select -> from -> where -> groupBy
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockResolvedValue(opts.creditsPurchased ?? []),
      }),
    }),
  })

  // 6. Last active: select -> from -> groupBy
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      groupBy: vi.fn().mockResolvedValue(opts.lastActive ?? []),
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/clients', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(createRequest())
    expect(response.status).toBe(401)
  })

  it('returns clients with stats and default pagination', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    setupDbMocks({
      total: 1,
      clients: [
        {
          id: 'user-1',
          name: 'Client A',
          email: 'a@test.com',
          credits: 10,
          createdAt: new Date(),
        },
      ],
      taskCounts: [{ clientId: 'user-1', count: 5 }],
      completedTasks: [{ clientId: 'user-1', count: 3 }],
      creditsPurchased: [{ userId: 'user-1', total: 50 }],
      lastActive: [{ userId: 'user-1', lastActiveAt: new Date('2026-02-18T10:00:00Z') }],
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients).toHaveLength(1)
    expect(data.data.clients[0].name).toBe('Client A')
    expect(data.data.clients[0].totalTasks).toBe(5)
    expect(data.data.clients[0].completedTasks).toBe(3)
    expect(data.data.clients[0].totalCreditsPurchased).toBe(50)
    expect(data.data.clients[0].lastActiveAt).toBeDefined()

    // Verify default pagination metadata
    expect(data.data.total).toBe(1)
    expect(data.data.page).toBe(1)
    expect(data.data.pageSize).toBe(50)
    expect(data.data.totalPages).toBe(1)
  })

  it('returns zero stats for clients with no tasks', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    setupDbMocks({
      total: 1,
      clients: [
        {
          id: 'user-2',
          name: 'New Client',
          email: 'new@test.com',
          credits: 0,
          createdAt: new Date(),
        },
      ],
    })

    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients[0].totalTasks).toBe(0)
    expect(data.data.clients[0].completedTasks).toBe(0)
    expect(data.data.clients[0].totalCreditsPurchased).toBe(0)
    expect(data.data.clients[0].lastActiveAt).toBeNull()
  })

  it('respects custom page and pageSize params', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    setupDbMocks({
      total: 75,
      clients: [
        {
          id: 'user-11',
          name: 'Client Page2',
          email: 'page2@test.com',
          credits: 5,
          createdAt: new Date(),
        },
      ],
    })

    const response = await GET(createRequest({ page: '2', pageSize: '10' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.page).toBe(2)
    expect(data.data.pageSize).toBe(10)
    expect(data.data.total).toBe(75)
    expect(data.data.totalPages).toBe(8)

    // Verify limit/offset were called on the clients query (2nd db.select call)
    const clientsSelectCall = mockDbSelect.mock.results[1]
    const fromFn = clientsSelectCall.value.from
    const whereFn = fromFn.mock.results[0].value.where
    const limitFn = whereFn.mock.results[0].value.limit
    const offsetFn = limitFn.mock.results[0].value.offset

    expect(limitFn).toHaveBeenCalledWith(10)
    expect(offsetFn).toHaveBeenCalledWith(10) // (page 2 - 1) * 10 = 10
  })

  it('filters clients by search term', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    setupDbMocks({
      total: 1,
      clients: [
        {
          id: 'user-1',
          name: 'Alice Smith',
          email: 'alice@test.com',
          credits: 10,
          createdAt: new Date(),
        },
      ],
      taskCounts: [{ clientId: 'user-1', count: 2 }],
    })

    const response = await GET(createRequest({ search: 'alice' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients).toHaveLength(1)
    expect(data.data.clients[0].name).toBe('Alice Smith')
    expect(data.data.total).toBe(1)
    expect(data.data.totalPages).toBe(1)

    // Verify ilike was called for search filtering
    const { ilike, or: orFn } = await import('drizzle-orm')
    expect(ilike).toHaveBeenCalled()
    expect(orFn).toHaveBeenCalled()
  })

  it('returns empty results for search with no matches', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    setupDbMocks({
      total: 0,
      clients: [],
    })

    const response = await GET(createRequest({ search: 'nonexistent' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients).toHaveLength(0)
    expect(data.data.total).toBe(0)
    expect(data.data.totalPages).toBe(0)
  })

  it('clamps pageSize to max 100', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    // pageSize=200 exceeds max of 100 so Zod should reject it
    const response = await GET(createRequest({ pageSize: '200' }))
    expect(response.status).toBe(400)
  })
})
