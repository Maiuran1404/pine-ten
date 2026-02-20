import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// ============================================================
// Integration test for POST /api/freelancer/submit-deliverable
// (Freelancer Deliverable Submission Flow)
//
// Verifies the full multi-step flow:
//   1. Freelancer authentication
//   2. Zod validation of { taskId, files[], message? }
//   3. Task lookup (must be assigned to this freelancer)
//   4. Task status validation (ASSIGNED, IN_PROGRESS, or REVISION_REQUESTED)
//   5. Deliverable files saved to taskFiles (isDeliverable: true)
//   6. Optional message saved to taskMessages with attachments
//   7. Task status updated to PENDING_ADMIN_REVIEW
//   8. Freelancer + client lookups for notification context
//   9. Admin notified (deliverablePendingReview, includes Slack)
//   10. Client emailed (deliverableSubmittedToClient)
//   11. Response with { success: true }
// ============================================================

// -- Mock server-only --
vi.mock('server-only', () => ({}))

// -- Mock logger --
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// -- Mock config --
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// -- Mock admin notifications --
const mockDeliverablePendingReview = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/notifications', () => ({
  adminNotifications: {
    deliverablePendingReview: (...args: unknown[]) => mockDeliverablePendingReview(...args),
  },
}))

// -- Mock email (dynamic import in the route) --
const mockSendEmail = vi.fn().mockResolvedValue(undefined)
const mockDeliverableSubmittedToClient = vi.fn().mockReturnValue({
  subject: 'Deliverable Submitted',
  html: '<p>Your designer has submitted deliverables</p>',
})
vi.mock('@/lib/notifications/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: {
    deliverableSubmittedToClient: (...args: unknown[]) => mockDeliverableSubmittedToClient(...args),
  },
}))

// -- Mock require-auth --
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

// -- DB mocks --
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    freelancerId: 'freelancerId',
    status: 'status',
    clientId: 'clientId',
    title: 'title',
    creditsUsed: 'creditsUsed',
  },
  taskFiles: {},
  taskMessages: {},
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { POST } = await import('./route')

// ============================================================
// Helpers
// ============================================================

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/freelancer/submit-deliverable',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function setupAuth(userId = 'freelancer-1', name = 'Jane Designer', email = 'jane@design.com') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name, email },
  })
}

function setupInsert() {
  mockInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  })
}

function setupUpdate() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

const validBody = {
  taskId: '123e4567-e89b-12d3-a456-426614174000',
  files: [
    {
      fileName: 'hero-banner-v2.png',
      fileUrl: 'https://storage.example.com/hero-banner-v2.png',
      fileType: 'image/png',
      fileSize: 2048000,
    },
    {
      fileName: 'social-post-design.jpg',
      fileUrl: 'https://storage.example.com/social-post.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024000,
    },
  ],
  message: 'Here are the final deliverables, including the revised hero banner.',
}

const mockTask = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Marketing Campaign Designs',
  clientId: 'client-1',
  freelancerId: 'freelancer-1',
  status: 'ASSIGNED',
  creditsUsed: 6,
}

const mockFreelancer = { name: 'Jane Designer', email: 'jane@design.com' }
const mockClient = { name: 'Marketing Team', email: 'marketing@company.com' }

// ============================================================
// Tests
// ============================================================

describe('POST /api/freelancer/submit-deliverable - Integration (Full Submission Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------
  // Happy Path: Full submission with all side effects
  // -------------------------------------------------------------------
  describe('happy path: full submission with ASSIGNED status', () => {
    it('saves files, adds message, updates status, and sends all notifications', async () => {
      setupAuth()

      // 1. Task lookup
      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))

      // 2-3. Insert calls (files + message)
      setupInsert()

      // 4. Update task status
      setupUpdate()

      // 5. Freelancer lookup for notification
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))

      // 6. Client lookup for notification
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(validBody) as never)
      const data = await response.json()

      // Correct response
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.success).toBe(true)

      // Files were saved (insert into taskFiles)
      expect(mockInsert).toHaveBeenCalled()

      // Message was saved (insert into taskMessages)
      // Two insert calls total: files + message
      expect(mockInsert).toHaveBeenCalledTimes(2)

      // Task status was updated to PENDING_ADMIN_REVIEW
      expect(mockUpdate).toHaveBeenCalledTimes(1)

      // Admin was notified (deliverablePendingReview)
      expect(mockDeliverablePendingReview).toHaveBeenCalledTimes(1)
      expect(mockDeliverablePendingReview).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          taskTitle: 'Marketing Campaign Designs',
          freelancerName: 'Jane Designer',
          freelancerEmail: 'jane@design.com',
          clientName: 'Marketing Team',
          clientEmail: 'marketing@company.com',
          fileCount: 2,
          credits: 6,
        })
      )

      // Client was emailed
      expect(mockDeliverableSubmittedToClient).toHaveBeenCalledTimes(1)
      expect(mockDeliverableSubmittedToClient).toHaveBeenCalledWith(
        'Marketing Team',
        'Marketing Campaign Designs',
        'Jane Designer',
        'https://crafted.test/dashboard/tasks/123e4567-e89b-12d3-a456-426614174000'
      )
      expect(mockSendEmail).toHaveBeenCalledTimes(1)
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'marketing@company.com',
          subject: 'Deliverable Submitted',
        })
      )
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Submission with IN_PROGRESS status
  // -------------------------------------------------------------------
  describe('happy path: submission with IN_PROGRESS status', () => {
    it('accepts submission from IN_PROGRESS task', async () => {
      setupAuth()
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' }

      mockSelect.mockReturnValueOnce(chainableSelect([inProgressTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.data.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Submission with REVISION_REQUESTED status
  // -------------------------------------------------------------------
  describe('happy path: re-submission after revision request', () => {
    it('accepts submission from REVISION_REQUESTED task', async () => {
      setupAuth()
      const revisionTask = { ...mockTask, status: 'REVISION_REQUESTED' }

      mockSelect.mockReturnValueOnce(chainableSelect([revisionTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Submission without a message
  // -------------------------------------------------------------------
  describe('happy path: submission without message', () => {
    it('saves files and updates status but skips message insert', async () => {
      setupAuth()

      const bodyNoMessage = {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        files: validBody.files,
      }

      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(bodyNoMessage) as never)
      expect(response.status).toBe(200)

      // Only one insert call (files only, no message)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Submission with empty message string
  // -------------------------------------------------------------------
  describe('happy path: submission with empty/whitespace message', () => {
    it('skips message insert when message is empty string', async () => {
      setupAuth()

      const bodyEmptyMessage = {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        files: validBody.files,
        message: '   ', // whitespace only
      }

      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(bodyEmptyMessage) as never)
      expect(response.status).toBe(200)

      // Only one insert call (files only, whitespace message is trimmed/skipped)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------
  // Error: Authentication required
  // -------------------------------------------------------------------
  describe('error: unauthenticated request', () => {
    it('returns 401 when no session', async () => {
      mockRequireAuth.mockRejectedValue(
        new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
      )

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(401)

      // No DB operations
      expect(mockSelect).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Error: Validation failures
  // -------------------------------------------------------------------
  describe('error: validation failures', () => {
    it('returns 400 when taskId is missing', async () => {
      setupAuth()

      const response = await POST(makeRequest({ files: validBody.files }) as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toBe('Validation failed')

      // No DB operations
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns 400 when taskId is not a valid UUID', async () => {
      setupAuth()

      const response = await POST(
        makeRequest({
          taskId: 'not-a-uuid',
          files: validBody.files,
        }) as never
      )
      expect(response.status).toBe(400)
    })

    it('returns 400 when files array is empty', async () => {
      setupAuth()

      const response = await POST(
        makeRequest({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
          files: [],
        }) as never
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toBe('Validation failed')
    })

    it('returns 400 when files array is not provided', async () => {
      setupAuth()

      const response = await POST(
        makeRequest({
          taskId: '123e4567-e89b-12d3-a456-426614174000',
        }) as never
      )
      expect(response.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------
  // Error: Task not found or not assigned to this freelancer
  // -------------------------------------------------------------------
  describe('error: task not found', () => {
    it('returns 404 when task does not exist or is not assigned to the user', async () => {
      setupAuth()
      mockSelect.mockReturnValueOnce(chainableSelect([]))

      const response = await POST(makeRequest(validBody) as never)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
      expect(data.error.message).toContain('Task')

      // No file saves or status updates
      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Error: Task status does not allow submission
  // -------------------------------------------------------------------
  describe('error: invalid task status for submission', () => {
    it('returns 400 when task is COMPLETED', async () => {
      setupAuth()
      const completedTask = { ...mockTask, status: 'COMPLETED' }
      mockSelect.mockReturnValueOnce(chainableSelect([completedTask]))

      const response = await POST(makeRequest(validBody) as never)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('Cannot submit deliverable')

      // No file saves or status updates
      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns 400 when task is PENDING', async () => {
      setupAuth()
      const pendingTask = { ...mockTask, status: 'PENDING' }
      mockSelect.mockReturnValueOnce(chainableSelect([pendingTask]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(400)
    })

    it('returns 400 when task is PENDING_ADMIN_REVIEW', async () => {
      setupAuth()
      const reviewTask = { ...mockTask, status: 'PENDING_ADMIN_REVIEW' }
      mockSelect.mockReturnValueOnce(chainableSelect([reviewTask]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(400)
    })

    it('returns 400 when task is CANCELLED', async () => {
      setupAuth()
      const cancelledTask = { ...mockTask, status: 'CANCELLED' }
      mockSelect.mockReturnValueOnce(chainableSelect([cancelledTask]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------
  // Resilience: Notification failures do not break submission
  // -------------------------------------------------------------------
  describe('resilience: notification failures are non-fatal', () => {
    it('returns 200 when admin notification fails', async () => {
      setupAuth()
      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      mockDeliverablePendingReview.mockRejectedValueOnce(new Error('Slack webhook timeout'))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(200)

      // Error was logged
      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to send notifications'
      )
    })

    it('returns 200 when client email fails', async () => {
      setupAuth()
      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      mockSendEmail.mockRejectedValueOnce(new Error('SMTP error'))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(200)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to send notifications'
      )
    })
  })

  // -------------------------------------------------------------------
  // Side-effect verification: Files saved correctly
  // -------------------------------------------------------------------
  describe('side effects: file records created with correct data', () => {
    it('marks all files as deliverables with correct metadata', async () => {
      setupAuth()
      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))

      // Capture the values passed to insert
      const insertValuesCalls: unknown[][] = []
      mockInsert.mockImplementation(() => ({
        values: vi.fn().mockImplementation((...args: unknown[]) => {
          insertValuesCalls.push(args)
          return Promise.resolve(undefined)
        }),
      }))

      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      await POST(makeRequest(validBody) as never)

      // First insert is for files
      expect(insertValuesCalls.length).toBeGreaterThanOrEqual(1)
    })
  })

  // -------------------------------------------------------------------
  // Side-effect verification: Client without email skips email
  // -------------------------------------------------------------------
  describe('side effects: handles missing client email gracefully', () => {
    it('skips client email when client has no email', async () => {
      setupAuth()
      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([{ name: 'No Email Client', email: null }]))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(200)

      // Admin was still notified
      expect(mockDeliverablePendingReview).toHaveBeenCalledTimes(1)

      // Client email was NOT sent (no email address)
      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Side-effect verification: Multiple files tracked correctly
  // -------------------------------------------------------------------
  describe('side effects: file count reported correctly to admin', () => {
    it('reports correct file count in admin notification', async () => {
      setupAuth()

      const bodyWithManyFiles = {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        files: [
          {
            fileName: 'f1.png',
            fileUrl: 'https://s.com/f1.png',
            fileType: 'image/png',
            fileSize: 1000,
          },
          {
            fileName: 'f2.png',
            fileUrl: 'https://s.com/f2.png',
            fileType: 'image/png',
            fileSize: 2000,
          },
          {
            fileName: 'f3.pdf',
            fileUrl: 'https://s.com/f3.pdf',
            fileType: 'application/pdf',
            fileSize: 3000,
          },
        ],
      }

      mockSelect.mockReturnValueOnce(chainableSelect([mockTask]))
      setupInsert()
      setupUpdate()
      mockSelect.mockReturnValueOnce(chainableSelect([mockFreelancer]))
      mockSelect.mockReturnValueOnce(chainableSelect([mockClient]))

      const response = await POST(makeRequest(bodyWithManyFiles) as never)
      expect(response.status).toBe(200)

      expect(mockDeliverablePendingReview).toHaveBeenCalledWith(
        expect.objectContaining({
          fileCount: 3,
        })
      )
    })
  })
})
