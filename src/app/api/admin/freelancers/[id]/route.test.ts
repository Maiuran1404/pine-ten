import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
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
  freelancerProfiles: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    skills: 'skills',
    specializations: 'specializations',
    portfolioUrls: 'portfolioUrls',
    bio: 'bio',
    timezone: 'timezone',
    hourlyRate: 'hourlyRate',
    rating: 'rating',
    completedTasks: 'completedTasks',
    whatsappNumber: 'whatsappNumber',
    availability: 'availability',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    image: 'image',
    role: 'role',
    createdAt: 'createdAt',
  },
  tasks: {
    id: 'id',
    title: 'title',
    status: 'status',
    freelancerId: 'freelancerId',
    createdAt: 'createdAt',
    completedAt: 'completedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  count: vi.fn(),
}))

const { GET, PUT } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/freelancers/fp-1',
    method: 'PUT',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/freelancers/[id]', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest(null) as never, {
      params: Promise.resolve({ id: 'fp-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when freelancer not found', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // Not a valid UUID so it goes to userId lookup
    // userId lookup returns empty
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
    // User lookup also returns empty (or non-freelancer)
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await GET(makeRequest(null) as never, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Freelancer')
  })

  it('returns freelancer with task stats when profile found by userId', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // userId lookup returns profile
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'fp-1',
                userId: 'user-1',
                status: 'APPROVED',
                skills: ['logo'],
                specializations: [],
                portfolioUrls: [],
                bio: 'Designer',
                timezone: null,
                hourlyRate: null,
                rating: '4.5',
                completedTasks: 10,
                whatsappNumber: null,
                availability: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                user: {
                  id: 'user-1',
                  name: 'Artist',
                  email: 'artist@test.com',
                  image: null,
                  createdAt: new Date(),
                },
              },
            ]),
          }),
        }),
      }),
    })
    // Task stats grouped by status
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockResolvedValue([
            { status: 'COMPLETED', count: 8 },
            { status: 'IN_PROGRESS', count: 2 },
          ]),
        }),
      }),
    })
    // Recent tasks
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'task-1',
                title: 'Logo',
                status: 'COMPLETED',
                createdAt: new Date(),
                completedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    })

    const response = await GET(makeRequest(null) as never, {
      params: Promise.resolve({ id: 'user-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.freelancer.status).toBe('APPROVED')
    expect(data.data.freelancer.taskCounts.completed).toBe(8)
    expect(data.data.freelancer.recentTasks).toHaveLength(1)
  })
})

describe('PUT /api/admin/freelancers/[id]', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await PUT(makeRequest({ name: 'Updated' }) as never, {
      params: Promise.resolve({ id: 'fp-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('updates freelancer profile', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // Find by profile ID
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'fp-1', userId: 'user-1' }]),
        }),
      }),
    })
    // Update user name
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    // Update profile
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    // Fetch updated freelancer
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'fp-1',
                userId: 'user-1',
                status: 'APPROVED',
                skills: ['logo', 'branding'],
                user: { id: 'user-1', name: 'Updated Artist', email: 'artist@test.com' },
              },
            ]),
          }),
        }),
      }),
    })

    const response = await PUT(
      makeRequest({ name: 'Updated Artist', skills: ['logo', 'branding'] }) as never,
      { params: Promise.resolve({ id: 'fp-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.freelancer.skills).toEqual(['logo', 'branding'])
  })
})
