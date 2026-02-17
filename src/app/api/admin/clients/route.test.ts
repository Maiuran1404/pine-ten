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
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    role: 'role',
    credits: 'credits',
    createdAt: 'createdAt',
  },
  tasks: { clientId: 'clientId', status: 'status' },
  creditTransactions: { userId: 'userId', type: 'type', amount: 'amount' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  count: vi.fn(),
  sum: vi.fn(),
}))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/clients', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns clients with stats', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // Clients query
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              id: 'user-1',
              name: 'Client A',
              email: 'a@test.com',
              credits: 10,
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    })
    // Task counts
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockResolvedValue([{ clientId: 'user-1', count: 5 }]),
      }),
    })
    // Completed task counts
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ clientId: 'user-1', count: 3 }]),
        }),
      }),
    })
    // Credits purchased
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([{ userId: 'user-1', total: 50 }]),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients).toHaveLength(1)
    expect(data.data.clients[0].name).toBe('Client A')
    expect(data.data.clients[0].totalTasks).toBe(5)
    expect(data.data.clients[0].completedTasks).toBe(3)
    expect(data.data.clients[0].totalCreditsPurchased).toBe(50)
  })

  it('returns zero stats for clients with no tasks', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              id: 'user-2',
              name: 'New Client',
              email: 'new@test.com',
              credits: 0,
              createdAt: new Date(),
            },
          ]),
        }),
      }),
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue([]) }),
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue([]) }),
      }),
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ groupBy: vi.fn().mockResolvedValue([]) }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.clients[0].totalTasks).toBe(0)
    expect(data.data.clients[0].completedTasks).toBe(0)
    expect(data.data.clients[0].totalCreditsPurchased).toBe(0)
  })
})
