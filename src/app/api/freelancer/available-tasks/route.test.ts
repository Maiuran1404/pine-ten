import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireApprovedFreelancer = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireApprovedFreelancer: (...args: unknown[]) => mockRequireApprovedFreelancer(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'id', status: 'status', freelancerId: 'freelancerId', categoryId: 'categoryId' },
  taskCategories: { id: 'id', name: 'name' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  isNull: vi.fn(),
  and: vi.fn(),
}))

const { GET } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableSelectWithJoin(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/freelancer/available-tasks', () => {
  const mockRequest = {
    url: 'http://localhost/api/freelancer/available-tasks',
    method: 'GET',
  }

  function setupAuth(userId = 'freelancer-1') {
    mockRequireApprovedFreelancer.mockResolvedValue({
      user: { id: userId, name: 'Test Artist', email: 'artist@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireApprovedFreelancer.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    )

    const response = await GET(mockRequest as never)
    expect(response.status).toBe(401)
  })

  it('returns 403 when freelancer is not approved', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireApprovedFreelancer.mockRejectedValue(
      new APIError(
        ErrorCodes.INSUFFICIENT_PERMISSIONS,
        'Your freelancer account is pending approval',
        403
      )
    )

    const response = await GET(mockRequest as never)
    expect(response.status).toBe(403)
  })

  it('returns 403 when no freelancer profile exists', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireApprovedFreelancer.mockRejectedValue(
      new APIError(
        ErrorCodes.INSUFFICIENT_PERMISSIONS,
        'Your freelancer account is pending approval',
        403
      )
    )

    const response = await GET(mockRequest as never)
    expect(response.status).toBe(403)
  })

  it('returns available tasks for approved freelancer', async () => {
    setupAuth()
    // Available tasks query (no profile lookup needed - requireApprovedFreelancer handles it)
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithJoin([
        {
          id: 'task-1',
          title: 'Logo Design',
          description: 'Need a logo',
          creditsUsed: 5,
          estimatedHours: '4',
          deadline: null,
          createdAt: new Date(),
          requirements: {},
          category: { name: 'Design' },
        },
      ])
    )

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(1)
    expect(data.data.tasks[0].title).toBe('Logo Design')
  })

  it('returns empty array when no tasks available', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelectWithJoin([]))

    const response = await GET(mockRequest as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(0)
  })
})
