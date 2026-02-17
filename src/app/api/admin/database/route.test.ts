import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/lib/audit', () => ({
  auditHelpers: { databaseAccess: vi.fn() },
  actorFromUser: vi.fn().mockReturnValue({ id: 'admin-1', type: 'user' }),
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { createdAt: 'createdAt' },
  sessions: { createdAt: 'createdAt' },
  accounts: { createdAt: 'createdAt' },
  verifications: { createdAt: 'createdAt' },
  freelancerProfiles: { createdAt: 'createdAt' },
  taskCategories: { createdAt: 'createdAt' },
  tasks: { createdAt: 'createdAt' },
  taskFiles: { createdAt: 'createdAt' },
  taskMessages: { createdAt: 'createdAt' },
  styleReferences: { createdAt: 'createdAt' },
  notifications: { createdAt: 'createdAt' },
  creditTransactions: { createdAt: 'createdAt' },
  platformSettings: { updatedAt: 'updatedAt' },
  companies: { createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  count: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

function makeRequest(options: { url?: string } = {}) {
  const url = options.url || 'http://localhost/api/admin/database'
  return {
    url,
    method: 'GET',
    nextUrl: { searchParams: new URL(url).searchParams },
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

describe('GET /api/admin/database', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest()
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return table counts when no table specified', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    // Mock all 14 count queries
    mockSelect.mockReturnValue({
      from: vi.fn().mockResolvedValue([{ count: 5 }]),
    })

    const request = makeRequest()
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tables).toBeDefined()
    expect(Array.isArray(data.data.tables)).toBe(true)
  })

  it('should return 400 for invalid table name', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ url: 'http://localhost/api/admin/database?table=invalidTable' })
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Invalid table name')
  })

  it('should return table data with pagination for valid table', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockData = [
      { id: 'u-1', name: 'Test', email: 'test@example.com', createdAt: new Date().toISOString() },
    ]

    // First call: count query
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ count: 1 }]),
      })
      // Second call: data query
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(mockData),
            }),
          }),
        }),
      })

    const request = makeRequest({ url: 'http://localhost/api/admin/database?table=users' })
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.table).toBe('users')
    expect(data.data.total).toBe(1)
    expect(data.data.data).toHaveLength(1)
  })
})
