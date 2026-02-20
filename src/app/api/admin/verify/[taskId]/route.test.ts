import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/config', () => ({
  config: { app: { url: 'http://localhost:3000' } },
}))

const mockAdminNotifications = {
  deliverableVerified: vi.fn().mockResolvedValue(undefined),
}
vi.mock('@/lib/notifications', () => ({
  adminNotifications: {
    deliverableVerified: (...args: unknown[]) =>
      mockAdminNotifications.deliverableVerified(...args),
  },
}))

// Mock dynamic import for email templates
vi.mock('@/lib/notifications/email', () => ({
  emailTemplates: {
    revisionRequested: vi.fn().mockReturnValue({
      subject: 'Revision Requested',
      html: '<p>Please revise</p>',
    }),
  },
  sendEmail: vi.fn().mockResolvedValue(undefined),
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
    description: 'description',
    status: 'status',
    createdAt: 'createdAt',
    clientId: 'clientId',
    freelancerId: 'freelancerId',
    updatedAt: 'updatedAt',
  },
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    image: 'image',
  },
  taskFiles: {
    taskId: 'taskId',
    isDeliverable: 'isDeliverable',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, POST } = await import('./route')

function makeParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) }
}

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/verify/task-1',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

const mockTask = {
  id: 'task-1',
  title: 'Logo Design',
  description: 'Design a company logo',
  status: 'PENDING_ADMIN_REVIEW',
  createdAt: new Date(),
  clientId: 'client-1',
  freelancerId: 'freelancer-1',
}

const mockClient = {
  id: 'client-1',
  name: 'Test Client',
  email: 'client@test.com',
  image: null,
}

const mockFreelancer = {
  id: 'freelancer-1',
  name: 'Test Designer',
  email: 'designer@test.com',
  image: null,
}

const mockDeliverables = [
  { taskId: 'task-1', isDeliverable: true, url: 'file1.png' },
  { taskId: 'task-1', isDeliverable: true, url: 'file2.png' },
  { taskId: 'task-1', isDeliverable: false, url: 'brief.pdf' },
]

function chainableSelectWithLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableSelectNoLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('GET /api/admin/verify/[taskId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })

  it('returns 404 when task not found', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([]))

    const response = await GET(makeRequest() as never, makeParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(data.error.message).toContain('Task')
  })

  it('returns task details with client, freelancer, and deliverables', async () => {
    // Task query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // Client query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // Freelancer query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // Deliverables query (no limit)
    mockSelect.mockReturnValueOnce(chainableSelectNoLimit(mockDeliverables))

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.task.id).toBe('task-1')
    expect(data.data.task.client.name).toBe('Test Client')
    expect(data.data.task.freelancer.name).toBe('Test Designer')
    expect(data.data.task.deliverables).toHaveLength(2)
    expect(data.data.task.attachments).toHaveLength(1)
  })

  it('returns task without freelancer when not assigned', async () => {
    const taskWithoutFreelancer = { ...mockTask, freelancerId: null }

    // Task query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([taskWithoutFreelancer]))
    // Client query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // Deliverables query (no freelancer query since freelancerId is null)
    mockSelect.mockReturnValueOnce(chainableSelectNoLimit([]))

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.task.freelancer).toBeNull()
  })
})

describe('POST /api/admin/verify/[taskId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })

  it('returns 400 when action is missing', async () => {
    const response = await POST(makeRequest({}) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('returns 400 when action is invalid', async () => {
    const response = await POST(makeRequest({ action: 'cancel' }) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('returns 404 when task not found', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([]))

    const response = await POST(
      makeRequest({ action: 'approve' }) as never,
      makeParams('nonexistent')
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('returns 400 when task status is not verifiable', async () => {
    const completedTask = { ...mockTask, status: 'COMPLETED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([completedTask]))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Cannot verify task with status')
  })

  it('returns 400 when task has ASSIGNED status', async () => {
    const assignedTask = { ...mockTask, status: 'ASSIGNED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([assignedTask]))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))

    expect(response.status).toBe(400)
  })

  it('approves task successfully and updates status to IN_REVIEW', async () => {
    // Task query (select().from().where().limit())
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // Client query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // Freelancer query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // Update task
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('approved')
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('rejects task successfully and updates status to REVISION_REQUESTED', async () => {
    // Task query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // Client query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // Freelancer query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // Update task
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(
      makeRequest({ action: 'reject', feedback: 'Please improve the colors' }) as never,
      makeParams('task-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('rejected')
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('handles notification failure gracefully on approve', async () => {
    // Task query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // Client query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // Freelancer query
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // Update task
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    // Notification fails
    mockAdminNotifications.deliverableVerified.mockRejectedValueOnce(
      new Error('Email service down')
    )

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))

    // Should still succeed even if notification fails
    expect(response.status).toBe(200)
  })

  it('approves task with IN_REVIEW status (verifiable)', async () => {
    const inReviewTask = { ...mockTask, status: 'IN_REVIEW' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([inReviewTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))

    expect(response.status).toBe(200)
  })

  it('approves task with REVISION_REQUESTED status (verifiable)', async () => {
    const revisionTask = { ...mockTask, status: 'REVISION_REQUESTED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([revisionTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))

    expect(response.status).toBe(200)
  })

  it('rejects task without freelancer assigned', async () => {
    const taskNoFreelancer = { ...mockTask, freelancerId: null }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([taskNoFreelancer]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // No freelancer query since freelancerId is null
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST(
      makeRequest({ action: 'reject', feedback: 'Needs work' }) as never,
      makeParams('task-1')
    )

    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })
})
