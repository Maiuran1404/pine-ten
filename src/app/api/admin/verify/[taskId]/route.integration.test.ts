import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// ============================================================
// Integration test for POST /api/admin/verify/[taskId] (Task Verification Flow)
//
// Verifies the full multi-step flows:
//
// APPROVE path:
//   1. Admin authentication
//   2. Zod validation of { action: 'approve', feedback? }
//   3. Task lookup + status validation (must be verifiable)
//   4. Client + freelancer info lookups
//   5. Task status updated to IN_REVIEW
//   6. Client notified via adminNotifications.deliverableVerified
//   7. Response with success message
//
// REJECT path:
//   1. Admin authentication
//   2. Zod validation of { action: 'reject', feedback? }
//   3. Task lookup + status validation
//   4. Client + freelancer info lookups
//   5. Task status updated to REVISION_REQUESTED
//   6. Freelancer notified via email with feedback
//   7. Response with success message
//
// GET path:
//   1. Admin authentication
//   2. Task lookup with client/freelancer details
//   3. Deliverable files fetched and categorized
// ============================================================

// -- Mock logger --
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// -- Mock config --
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// -- Mock admin notifications --
const mockDeliverableVerified = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/notifications', () => ({
  adminNotifications: {
    deliverableVerified: (...args: unknown[]) => mockDeliverableVerified(...args),
  },
}))

// -- Mock email (dynamic import used in reject path) --
const mockSendEmail = vi.fn().mockResolvedValue(undefined)
const mockRevisionRequested = vi.fn().mockReturnValue({
  subject: 'Revision Requested',
  html: '<p>Please revise your deliverables</p>',
})
vi.mock('@/lib/notifications/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: {
    revisionRequested: (...args: unknown[]) => mockRevisionRequested(...args),
  },
}))

// -- Mock require-admin --
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

// -- DB mocks --
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

// ============================================================
// Helpers
// ============================================================

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

function setupUpdate() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

const mockTask = {
  id: 'task-1',
  title: 'Brand Identity Design',
  description: 'Complete brand identity package',
  status: 'PENDING_ADMIN_REVIEW',
  createdAt: new Date('2026-01-15'),
  clientId: 'client-1',
  freelancerId: 'freelancer-1',
  creditsUsed: 8,
}

const mockClient = {
  id: 'client-1',
  name: 'Acme Corp',
  email: 'client@acme.com',
  image: null,
}

const mockFreelancer = {
  id: 'freelancer-1',
  name: 'Jane Designer',
  email: 'jane@design.com',
  image: 'https://example.com/jane.jpg',
}

const mockDeliverables = [
  {
    taskId: 'task-1',
    isDeliverable: true,
    fileName: 'logo-v1.png',
    fileUrl: 'https://storage/logo-v1.png',
  },
  {
    taskId: 'task-1',
    isDeliverable: true,
    fileName: 'brand-guide.pdf',
    fileUrl: 'https://storage/brand-guide.pdf',
  },
  {
    taskId: 'task-1',
    isDeliverable: false,
    fileName: 'brief.pdf',
    fileUrl: 'https://storage/brief.pdf',
  },
]

// ============================================================
// Tests
// ============================================================

describe('GET /api/admin/verify/[taskId] - Integration (Fetch Task for Verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Full task details with client, freelancer, deliverables
  // -------------------------------------------------------------------
  it('returns complete task details with client, freelancer, and categorized files', async () => {
    // 1. Task lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // 2. Client lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // 3. Freelancer lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // 4. Files lookup (no limit)
    mockSelect.mockReturnValueOnce(chainableSelectNoLimit(mockDeliverables))

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Task data present
    expect(data.data.task.id).toBe('task-1')
    expect(data.data.task.title).toBe('Brand Identity Design')

    // Client data present
    expect(data.data.task.client.name).toBe('Acme Corp')
    expect(data.data.task.client.email).toBe('client@acme.com')

    // Freelancer data present
    expect(data.data.task.freelancer.name).toBe('Jane Designer')

    // Files split into deliverables vs attachments
    expect(data.data.task.deliverables).toHaveLength(2)
    expect(data.data.task.attachments).toHaveLength(1)

    // All 4 DB queries were made
    expect(mockSelect).toHaveBeenCalledTimes(4)
  })

  // -------------------------------------------------------------------
  // Happy Path: Task without freelancer assigned
  // -------------------------------------------------------------------
  it('returns task with null freelancer when not assigned', async () => {
    const taskNoFreelancer = { ...mockTask, freelancerId: null }

    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([taskNoFreelancer]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // No freelancer query (freelancerId is null)
    mockSelect.mockReturnValueOnce(chainableSelectNoLimit([]))

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.task.freelancer).toBeNull()

    // Only 3 DB queries (no freelancer lookup)
    expect(mockSelect).toHaveBeenCalledTimes(3)
  })

  // -------------------------------------------------------------------
  // Error: Not admin
  // -------------------------------------------------------------------
  it('returns 401 when user is not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not an admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })

  // -------------------------------------------------------------------
  // Error: Task not found
  // -------------------------------------------------------------------
  it('returns 404 when task does not exist', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([]))

    const response = await GET(makeRequest() as never, makeParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
  })
})

describe('POST /api/admin/verify/[taskId] - Integration (Approve Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Approve task end-to-end
  // -------------------------------------------------------------------
  it('approves task: updates status to IN_REVIEW and notifies client', async () => {
    // 1. Task lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // 2. Client lookup for notification
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // 3. Freelancer lookup for notification
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // 4. Task status update
    setupUpdate()

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    const data = await response.json()

    // Correct response
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('approved')
    expect(data.data.message).toContain('client notified')

    // Task status was updated (to IN_REVIEW)
    expect(mockUpdate).toHaveBeenCalledTimes(1)

    // Client was notified
    expect(mockDeliverableVerified).toHaveBeenCalledTimes(1)
    expect(mockDeliverableVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        taskTitle: 'Brand Identity Design',
        clientName: 'Acme Corp',
        clientEmail: 'client@acme.com',
        freelancerName: 'Jane Designer',
        taskUrl: 'https://crafted.test/dashboard/tasks/task-1',
      })
    )

    // No rejection email sent
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------
  // Happy Path: Approve task with IN_REVIEW status
  // -------------------------------------------------------------------
  it('approves task that is already IN_REVIEW (re-approve after revision)', async () => {
    const inReviewTask = { ...mockTask, status: 'IN_REVIEW' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([inReviewTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    setupUpdate()

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(200)
  })

  // -------------------------------------------------------------------
  // Happy Path: Approve task with REVISION_REQUESTED status
  // -------------------------------------------------------------------
  it('approves task that was in REVISION_REQUESTED status', async () => {
    const revisionTask = { ...mockTask, status: 'REVISION_REQUESTED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([revisionTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    setupUpdate()

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(200)
  })

  // -------------------------------------------------------------------
  // Resilience: Notification failure on approve does not break response
  // -------------------------------------------------------------------
  it('returns 200 even when client notification fails on approve', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    setupUpdate()

    mockDeliverableVerified.mockRejectedValueOnce(new Error('Email service down'))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(200)

    // Error was logged but didn't crash
    const { logger } = await import('@/lib/logger')
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Failed to send client notification'
    )
  })

  // -------------------------------------------------------------------
  // Error: Non-verifiable task status
  // -------------------------------------------------------------------
  it('returns 400 when task status is COMPLETED (not verifiable)', async () => {
    const completedTask = { ...mockTask, status: 'COMPLETED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([completedTask]))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Cannot verify task with status')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 when task status is ASSIGNED (not verifiable)', async () => {
    const assignedTask = { ...mockTask, status: 'ASSIGNED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([assignedTask]))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 when task status is PENDING (not verifiable)', async () => {
    const pendingTask = { ...mockTask, status: 'PENDING' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([pendingTask]))

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------
  // Error: Task not found
  // -------------------------------------------------------------------
  it('returns 404 when task does not exist', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([]))

    const response = await POST(
      makeRequest({ action: 'approve' }) as never,
      makeParams('ghost-task')
    )
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDeliverableVerified).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------
  // Error: Validation failure
  // -------------------------------------------------------------------
  it('returns 400 when action is missing', async () => {
    const response = await POST(makeRequest({}) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns 400 when action is invalid value', async () => {
    const response = await POST(makeRequest({ action: 'destroy' }) as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  // -------------------------------------------------------------------
  // Error: Authentication
  // -------------------------------------------------------------------
  it('returns 401 when not authenticated', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(401)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required', 403)
    )

    const response = await POST(makeRequest({ action: 'approve' }) as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })
})

describe('POST /api/admin/verify/[taskId] - Integration (Reject Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Reject task end-to-end
  // -------------------------------------------------------------------
  it('rejects task: updates status to REVISION_REQUESTED and emails freelancer with feedback', async () => {
    // 1. Task lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    // 2. Client lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // 3. Freelancer lookup
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    // 4. Task status update
    setupUpdate()

    const feedback = 'The logo needs higher resolution and the colors are too muted'

    const response = await POST(
      makeRequest({ action: 'reject', feedback }) as never,
      makeParams('task-1')
    )
    const data = await response.json()

    // Correct response
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('rejected')
    expect(data.data.message).toContain('freelancer notified')

    // Task status was updated (to REVISION_REQUESTED)
    expect(mockUpdate).toHaveBeenCalledTimes(1)

    // Freelancer was emailed with feedback
    expect(mockRevisionRequested).toHaveBeenCalledTimes(1)
    expect(mockRevisionRequested).toHaveBeenCalledWith(
      'Jane Designer',
      'Brand Identity Design',
      'https://crafted.test/portal/tasks/task-1',
      feedback
    )
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@design.com',
        subject: 'Revision Requested',
      })
    )

    // Client was NOT notified (only on approve)
    expect(mockDeliverableVerified).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------
  // Happy Path: Reject without explicit feedback uses default
  // -------------------------------------------------------------------
  it('rejects task with default feedback when none provided', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    setupUpdate()

    const response = await POST(makeRequest({ action: 'reject' }) as never, makeParams('task-1'))
    expect(response.status).toBe(200)

    // Default feedback message used
    expect(mockRevisionRequested).toHaveBeenCalledWith(
      'Jane Designer',
      'Brand Identity Design',
      'https://crafted.test/portal/tasks/task-1',
      'Admin review: Please revise the deliverables and resubmit.'
    )
  })

  // -------------------------------------------------------------------
  // Happy Path: Reject task with no freelancer assigned
  // -------------------------------------------------------------------
  it('rejects task without freelancer: no email sent', async () => {
    const taskNoFreelancer = { ...mockTask, freelancerId: null }

    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([taskNoFreelancer]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    // No freelancer query since freelancerId is null
    setupUpdate()

    const response = await POST(
      makeRequest({ action: 'reject', feedback: 'Needs improvements' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(200)

    // Status was still updated
    expect(mockUpdate).toHaveBeenCalledTimes(1)

    // No email sent (no freelancer to notify)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------
  // Resilience: Email failure on reject does not break response
  // -------------------------------------------------------------------
  it('returns 200 even when freelancer email fails on reject', async () => {
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockTask]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockClient]))
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([mockFreelancer]))
    setupUpdate()

    mockSendEmail.mockRejectedValueOnce(new Error('SMTP connection refused'))

    const response = await POST(
      makeRequest({ action: 'reject', feedback: 'Fix the colors' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(200)

    // Error was logged
    const { logger } = await import('@/lib/logger')
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Failed to send freelancer notification'
    )
  })

  // -------------------------------------------------------------------
  // Error: Non-verifiable status on reject
  // -------------------------------------------------------------------
  it('returns 400 when trying to reject a COMPLETED task', async () => {
    const completedTask = { ...mockTask, status: 'COMPLETED' }
    mockSelect.mockReturnValueOnce(chainableSelectWithLimit([completedTask]))

    const response = await POST(
      makeRequest({ action: 'reject', feedback: 'Needs work' }) as never,
      makeParams('task-1')
    )
    expect(response.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
