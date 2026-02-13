import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()

vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

// Mock Drizzle query builders
const mockSelect = vi.fn()

vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { role: 'role' },
  tasks: { status: 'status' },
  freelancerProfiles: { status: 'status' },
  creditTransactions: { amount: 'amount', type: 'type' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn().mockReturnValue('count'),
  sum: vi.fn().mockReturnValue('sum'),
  notInArray: vi.fn(),
}))

const { GET } = await import('./route')

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
    })

    // Set up chainable mock that resolves to count results
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5, total: '10' }]),
      }),
    })
  })

  it('should return stats with cache headers', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('totalClients')
    expect(data.data).toHaveProperty('totalFreelancers')
    expect(data.data).toHaveProperty('pendingApprovals')
    expect(data.data).toHaveProperty('activeTasks')
    expect(data.data).toHaveProperty('completedTasks')
    expect(data.data).toHaveProperty('totalRevenue')

    // Should have cache headers
    const cacheControl = response.headers.get('Cache-Control')
    expect(cacheControl).toContain('private')
    expect(cacheControl).toContain('max-age=60')
  })

  it('should return 401 if not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should handle query failures gracefully via safeQuery', async () => {
    // Make all selects throw
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    })

    const response = await GET()
    const data = await response.json()

    // Should still return 200 with default values
    expect(response.status).toBe(200)
    expect(data.data.totalClients).toBe(0)
    expect(data.data.totalFreelancers).toBe(0)
  })
})
