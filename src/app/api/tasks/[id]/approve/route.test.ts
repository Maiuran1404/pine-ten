import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

// Mock email (dynamic import in the route)
vi.mock('@/lib/notifications/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    taskApprovedForClient: vi.fn().mockReturnValue({
      subject: 'Task Approved',
      html: '<p>Approved</p>',
    }),
    taskApprovedForFreelancer: vi.fn().mockReturnValue({
      subject: 'Work Approved',
      html: '<p>Approved</p>',
    }),
  },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'id', clientId: 'clientId', status: 'status' },
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/tasks/[id]/approve', () => {
  const taskId = 'task-123'
  const params = Promise.resolve({ id: taskId })

  function setupAuth(userId = 'client-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test Client', email: 'client@test.com' },
    })
  }

  function setupUpdate() {
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  const mockRequest = {
    url: 'http://localhost/api/tasks/task-123/approve',
    method: 'POST',
  }

  it('returns 404 when task not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 403 when user is not the task owner', async () => {
    setupAuth('different-user')
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_REVIEW',
          creditsUsed: 5,
        },
      ])
    )

    const response = await POST(mockRequest as never, { params })
    expect(response.status).toBe(403)
  })

  it('returns 400 when task is not in IN_REVIEW status', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'PENDING',
          creditsUsed: 5,
        },
      ])
    )

    const response = await POST(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('in review')
  })

  it('approves the task and returns success', async () => {
    setupAuth()
    // Task lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
          status: 'IN_REVIEW',
          creditsUsed: 5,
        },
      ])
    )
    setupUpdate()
    // Client user lookup for email
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test Client', email: 'client@test.com' }])
    )
    // Freelancer user lookup for email
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test Artist', email: 'artist@test.com' }])
    )

    const response = await POST(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.message).toContain('approved')
  })

  it('handles missing freelancer gracefully', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: null,
          status: 'IN_REVIEW',
          creditsUsed: 5,
        },
      ])
    )
    setupUpdate()
    // Client user lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test Client', email: 'client@test.com' }])
    )

    const response = await POST(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(mockRequest as never, { params })
    expect(response.status).toBe(401)
  })
})
