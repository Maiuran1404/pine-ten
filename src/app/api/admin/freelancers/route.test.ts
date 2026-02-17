import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  freelancerProfiles: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    skills: 'skills',
    specializations: 'specializations',
    portfolioUrls: 'portfolioUrls',
    bio: 'bio',
    completedTasks: 'completedTasks',
    rating: 'rating',
    createdAt: 'createdAt',
  },
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    role: 'role',
    createdAt: 'createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

describe('GET /api/admin/freelancers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = new Request('http://localhost/api/admin/freelancers')
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return list of freelancers', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(
      chainableSelect([
        {
          id: 'profile-1',
          odUserId: 'user-1',
          status: 'APPROVED',
          skills: ['react', 'node'],
          specializations: [],
          portfolioUrls: ['https://example.com'],
          bio: 'A designer',
          completedTasks: 5,
          rating: '4.5',
          profileCreatedAt: new Date(),
          userCreatedAt: new Date(),
          user: { name: 'Test User', email: 'test@example.com' },
        },
      ])
    )

    const request = new Request('http://localhost/api/admin/freelancers')
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.freelancers).toHaveLength(1)
    expect(data.data.freelancers[0].status).toBe('APPROVED')
  })

  it('should handle freelancers without profiles', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(
      chainableSelect([
        {
          id: null,
          odUserId: 'user-2',
          status: null,
          skills: null,
          specializations: null,
          portfolioUrls: null,
          bio: null,
          completedTasks: null,
          rating: null,
          profileCreatedAt: null,
          userCreatedAt: new Date(),
          user: { name: 'New User', email: 'new@example.com' },
        },
      ])
    )

    const request = new Request('http://localhost/api/admin/freelancers')
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.freelancers[0].status).toBe('NOT_ONBOARDED')
    expect(data.data.freelancers[0].id).toBe('user-2')
    expect(data.data.freelancers[0].skills).toEqual([])
  })

  it('should return empty list when no freelancers exist', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([]))

    const request = new Request('http://localhost/api/admin/freelancers')
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.freelancers).toEqual([])
  })

  it('should use userId as id fallback when no profile exists', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(
      chainableSelect([
        {
          id: 'profile-abc',
          odUserId: 'user-abc',
          status: 'PENDING_REVIEW',
          skills: ['design'],
          specializations: [],
          portfolioUrls: [],
          bio: null,
          completedTasks: 0,
          rating: null,
          profileCreatedAt: new Date(),
          userCreatedAt: new Date(),
          user: { name: 'Profile User', email: 'profile@example.com' },
        },
      ])
    )

    const request = new Request('http://localhost/api/admin/freelancers')
    const response = await GET(request as never)
    const data = await response.json()

    expect(data.data.freelancers[0].id).toBe('profile-abc')
    expect(data.data.freelancers[0].userId).toBe('user-abc')
  })
})
