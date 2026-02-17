import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

const mockNotify = vi.fn()
vi.mock('@/lib/notifications', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'http://localhost:3000' } },
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    status: 'status',
    freelancerId: 'freelancerId',
    clientId: 'clientId',
    assignedAt: 'assignedAt',
    updatedAt: 'updatedAt',
  },
  users: { id: 'id', name: 'name', email: 'email', image: 'image' },
  freelancerProfiles: {
    userId: 'userId',
    status: 'status',
    completedTasks: 'completedTasks',
    rating: 'rating',
    availability: 'availability',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { GET, POST } = await import('./route')

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/tasks/task-1/reassign',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

const mockTask = {
  id: 'task-1',
  title: 'Design Logo',
  status: 'ASSIGNED',
  freelancerId: 'freelancer-old',
  clientId: 'client-1',
}

const mockFreelancer = {
  userId: 'freelancer-new',
  status: 'APPROVED',
  name: 'New Designer',
  email: 'new@test.com',
}

describe('POST /api/admin/tasks/[id]/reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
    mockNotify.mockResolvedValue(undefined)
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-new' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    const response = await POST(makeRequest({ freelancerId: '' }) as never, makeParams('task-1'))
    expect(response.status).toBe(400)
  })

  it('returns 404 when task not found', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-new' }) as never,
      makeParams('nonexistent')
    )
    expect(response.status).toBe(404)
  })

  it('returns 400 for non-reassignable task status', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...mockTask, status: 'COMPLETED' }]),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-new' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 when freelancer not found or not approved', async () => {
    // Task found
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockTask]),
      }),
    })
    // Freelancer not found
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'nonexistent' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 when reassigning to same freelancer', async () => {
    // Task found
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockTask]),
      }),
    })
    // Freelancer found but same as current
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockFreelancer, userId: 'freelancer-old' }]),
        }),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-old' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(400)
  })

  it('reassigns task successfully', async () => {
    const updatedTask = { ...mockTask, freelancerId: 'freelancer-new', status: 'ASSIGNED' }

    // Task found
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockTask]),
      }),
    })
    // Freelancer found
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockFreelancer]),
        }),
      }),
    })
    // Update task
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedTask]),
        }),
      }),
    })

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-new' }) as never,
      makeParams('task-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.assignedTo).toBe('New Designer')
  })

  it('handles notification failure gracefully', async () => {
    const updatedTask = { ...mockTask, freelancerId: 'freelancer-new', status: 'ASSIGNED' }

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockTask]),
      }),
    })
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockFreelancer]),
        }),
      }),
    })
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedTask]),
        }),
      }),
    })
    mockNotify.mockRejectedValue(new Error('Notification failed'))

    const response = await POST(
      makeRequest({ freelancerId: 'freelancer-new' }) as never,
      makeParams('task-1')
    )

    // Should still succeed even if notification fails
    expect(response.status).toBe(200)
  })
})

describe('GET /api/admin/tasks/[id]/reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns list of available freelancers', async () => {
    const freelancers = [
      {
        userId: 'f-1',
        name: 'Artist A',
        email: 'a@test.com',
        image: null,
        completedTasks: 5,
        rating: '4.5',
        availability: true,
      },
      {
        userId: 'f-2',
        name: 'Artist B',
        email: 'b@test.com',
        image: null,
        completedTasks: 10,
        rating: '4.8',
        availability: true,
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(freelancers),
          }),
        }),
      }),
    })

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.freelancers).toHaveLength(2)
  })
})
