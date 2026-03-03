import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// ============================================================
// Integration test for POST /api/tasks (Task Creation Flow)
//
// Verifies the full multi-step flow:
//   1. Client authentication
//   2. Zod validation of request body
//   3. Credit check + deduction (inside transaction)
//   4. Category lookup
//   5. Task creation with complexity/urgency detection
//   6. Freelancer ranking + assignment (or fallback)
//   7. Task offer record creation
//   8. Activity log entries (created + assigned)
//   9. Credit transaction record
//   10. Attachment saving + brief linking
//   11. Post-transaction notifications (admin email, WhatsApp, artist, client)
//   12. Final response with taskId, status, assignedTo, matchScore
// ============================================================

// -- Mock server-only --
vi.mock('server-only', () => ({}))

// -- Mock logger --
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// -- Mock config --
vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'https://crafted.test' },
    rateLimits: { api: 100 },
    tasks: { defaultMaxRevisions: 3 },
    uploads: { maxFileSizeMB: 50 },
  },
}))

// -- Mock notifications (track calls via wrapper pattern) --
const mockNotify = vi.fn().mockResolvedValue(undefined)
const mockNewTaskCreated = vi.fn().mockResolvedValue(undefined)
const mockNotifyAdminWhatsApp = vi.fn().mockResolvedValue(undefined)
const mockWhatsAppTemplate = vi.fn().mockReturnValue('whatsapp msg')
vi.mock('@/lib/notifications', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
  adminNotifications: {
    newTaskCreated: (...args: unknown[]) => mockNewTaskCreated(...args),
  },
  notifyAdminWhatsApp: (...args: unknown[]) => mockNotifyAdminWhatsApp(...args),
  adminWhatsAppTemplates: {
    newTaskCreated: (...args: unknown[]) => mockWhatsAppTemplate(...args),
  },
}))

const mockSendNotificationEmail = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/notifications/safe-send', () => ({
  sendNotificationEmail: (...args: unknown[]) => mockSendNotificationEmail(...args),
}))

vi.mock('@/lib/notifications/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    taskAssignedToClient: vi.fn().mockReturnValue({ subject: 'Assigned', html: '<p>hi</p>' }),
  },
}))

// -- Mock rate limit --
const mockCheckRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// -- Mock require-auth --
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireRole: (...args: unknown[]) => mockRequireAuth(...args),
}))

// -- Mock assignment algorithm --
const mockRankArtistsForTask = vi.fn()
const mockDetectTaskComplexity = vi.fn()
const mockDetectTaskUrgency = vi.fn()
vi.mock('@/lib/assignment-algorithm', () => ({
  rankArtistsForTask: (...args: unknown[]) => mockRankArtistsForTask(...args),
  detectTaskComplexity: (...args: unknown[]) => mockDetectTaskComplexity(...args),
  detectTaskUrgency: (...args: unknown[]) => mockDetectTaskUrgency(...args),
}))

// -- Mock deadline calculations --
vi.mock('@/lib/deadline', () => ({
  calculateDeliveryDays: vi.fn().mockReturnValue(3),
  calculateDeadlineFromNow: vi.fn().mockReturnValue(new Date('2025-02-25T00:00:00Z')),
}))

// -- Mock validations (pass-through by default) --
vi.mock('@/lib/validations', () => ({
  createTaskSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

// -- DB mocks (transaction-level) --
const mockWithTransaction = vi.fn()
const mockSelect = vi.fn()
const mockBriefsFindFirst = vi.fn().mockResolvedValue(undefined)
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    query: {
      briefs: {
        findFirst: (...args: unknown[]) => mockBriefsFindFirst(...args),
      },
    },
  },
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    description: 'description',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    creditsUsed: 'creditsUsed',
    estimatedHours: 'estimatedHours',
    deadline: 'deadline',
    assignedAt: 'assignedAt',
    completedAt: 'completedAt',
    moodboardItems: 'moodboardItems',
    styleReferences: 'styleReferences',
    structureData: 'structureData',
    chatHistory: 'chatHistory',
    requirements: 'requirements',
    priority: 'priority',
    freelancerId: 'freelancerId',
    clientId: 'clientId',
    categoryId: 'categoryId',
  },
  users: {
    id: 'id',
    name: 'name',
    image: 'image',
    credits: 'credits',
    companyId: 'companyId',
    email: 'email',
    role: 'role',
  },
  taskCategories: { id: 'id', slug: 'slug' },
  taskFiles: {
    taskId: 'taskId',
    fileUrl: 'fileUrl',
    fileName: 'fileName',
    fileType: 'fileType',
    fileSize: 'fileSize',
    isDeliverable: 'isDeliverable',
  },
  creditTransactions: {},
  taskActivityLog: {},
  briefs: { id: 'id' },
  taskOffers: {},
  freelancerProfiles: {
    userId: 'userId',
    status: 'status',
    timezone: 'timezone',
    experienceLevel: 'experienceLevel',
    rating: 'rating',
    completedTasks: 'completedTasks',
    acceptanceRate: 'acceptanceRate',
    onTimeRate: 'onTimeRate',
    maxConcurrentTasks: 'maxConcurrentTasks',
    workingHoursStart: 'workingHoursStart',
    workingHoursEnd: 'workingHoursEnd',
    acceptsUrgentTasks: 'acceptsUrgentTasks',
    vacationMode: 'vacationMode',
    skills: 'skills',
    specializations: 'specializations',
    preferredCategories: 'preferredCategories',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  ne: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  count: vi.fn().mockReturnValue('count'),
  inArray: vi.fn(),
  like: vi.fn(),
}))

const { POST } = await import('./route')

// ============================================================
// Helpers
// ============================================================

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/tasks',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'client-1',
    name: 'Test Client',
    email: 'client@example.com',
    role: 'CLIENT',
    ...overrides,
  }
  mockRequireAuth.mockResolvedValue({ user })
  return user
}

const validBody = {
  title: 'Landing Page Design',
  description: 'Design a modern landing page for our SaaS product',
  creditsRequired: 5,
  category: 'web-design',
  requirements: { skills: ['UI Design', 'Figma'] },
  estimatedHours: 8,
}

const newTask = {
  id: 'task-new-1',
  title: 'Landing Page Design',
  status: 'PENDING',
  clientId: 'client-1',
  creditsUsed: 5,
}

const bestArtist = {
  artist: {
    userId: 'artist-1',
    name: 'Top Designer',
    email: 'artist@example.com',
    timezone: 'America/New_York',
    experienceLevel: 'SENIOR',
    rating: 4.8,
    completedTasks: 25,
    acceptanceRate: 0.95,
    onTimeRate: 0.98,
    maxConcurrentTasks: 5,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    acceptsUrgentTasks: true,
    vacationMode: false,
    skills: ['UI Design', 'Figma'],
    specializations: ['Web Design'],
    preferredCategories: ['web-design'],
  },
  totalScore: 92,
  breakdown: {
    skillScore: 25,
    timezoneScore: 18,
    experienceScore: 20,
    workloadScore: 14,
    performanceScore: 15,
  },
  excluded: false,
}

/**
 * Build a fully instrumented transaction mock that tracks every DB call.
 */
function buildTxMock(options: {
  credits?: number
  companyId?: string | null
  categoryId?: string | null
  task?: Record<string, unknown>
}) {
  let selectCallCount = 0

  const mockTx = {
    select: vi.fn().mockImplementation(() => {
      selectCallCount++
      const currentCall = selectCallCount

      if (currentCall === 1) {
        // User credits lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi
                .fn()
                .mockResolvedValue([
                  { credits: options.credits ?? 50, companyId: options.companyId ?? null },
                ]),
            }),
          }),
        }
      }
      if (currentCall === 2) {
        // Category lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue(options.categoryId ? [{ id: options.categoryId }] : []),
            }),
          }),
        }
      }
      // Fallback artist lookup (only reached when rankArtistsForTask returns empty)
      return {
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      }
    }),
    insert: vi.fn().mockImplementation(() => {
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([options.task ?? newTask]),
        }),
      }
    }),
    update: vi.fn().mockImplementation(() => {
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }
    }),
  }

  return { mockTx }
}

// ============================================================
// Tests
// ============================================================

describe('POST /api/tasks - Integration (Task Creation Flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue({ limited: false, resetIn: 0 })
    mockDetectTaskComplexity.mockReturnValue('INTERMEDIATE')
    mockDetectTaskUrgency.mockReturnValue('STANDARD')
  })

  // -------------------------------------------------------------------
  // Happy Path: Full end-to-end task creation with assignment
  // -------------------------------------------------------------------
  describe('happy path: task created with freelancer assignment', () => {
    it('creates task, deducts credits, assigns freelancer, logs activity, and sends all notifications', async () => {
      const user = setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: 'company-1',
        categoryId: 'cat-web-design',
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([bestArtist])

      const response = await POST(makeRequest(validBody) as never)
      const data = await response.json()

      // 1. Correct HTTP response
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.taskId).toBe('task-new-1')
      expect(data.data.status).toBe('ASSIGNED')
      expect(data.data.assignedTo).toBe('Top Designer')
      expect(data.data.matchScore).toBe(92)

      // 2. Credits were checked (select with row lock)
      expect(mockTx.select).toHaveBeenCalled()

      // 3. Task was created (insert into tasks)
      expect(mockTx.insert).toHaveBeenCalled()

      // 4. Task was assigned (update tasks SET status, freelancerId, assignedAt)
      expect(mockTx.update).toHaveBeenCalled()

      // 5. Credit transaction, task offer, activity logs all recorded
      //    Total inserts: tasks + taskOffers + 2x taskActivityLog + creditTransactions = 5
      expect(mockTx.insert).toHaveBeenCalledTimes(5)

      // 6. Credits deducted + task assignment update = 2 updates
      expect(mockTx.update).toHaveBeenCalledTimes(2)

      // 7. Admin email notification was sent
      expect(mockNewTaskCreated).toHaveBeenCalledTimes(1)
      expect(mockNewTaskCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-new-1',
          taskTitle: 'Landing Page Design',
          clientName: user.name,
          clientEmail: user.email,
          category: 'web-design',
          creditsUsed: 5,
          companyId: 'company-1',
        })
      )

      // 8. WhatsApp notification was sent
      expect(mockWhatsAppTemplate).toHaveBeenCalledTimes(1)
      expect(mockNotifyAdminWhatsApp).toHaveBeenCalledTimes(1)

      // 9. Artist was notified of assignment
      expect(mockNotify).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'artist-1',
          type: 'TASK_ASSIGNED',
          taskId: 'task-new-1',
        })
      )

      // 10. Client was emailed about task assignment
      expect(mockSendNotificationEmail).toHaveBeenCalledTimes(1)

      // 11. Logger recorded the success
      const { logger } = await import('@/lib/logger')
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-new-1',
          userId: 'client-1',
          creditsUsed: 5,
          assignedTo: 'artist-1',
          matchScore: 92,
        }),
        'Task created successfully'
      )
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Task created with no freelancer available
  // -------------------------------------------------------------------
  describe('happy path: task created with no available freelancer', () => {
    it('creates task in PENDING status when no freelancer is ranked or falls back', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      const response = await POST(makeRequest(validBody) as never)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.status).toBe('PENDING')
      expect(data.data.assignedTo).toBeNull()
      expect(data.data.matchScore).toBeNull()

      // No artist notification when no assignment
      expect(mockNotify).not.toHaveBeenCalled()
      // No client assignment email when no assignment
      expect(mockSendNotificationEmail).not.toHaveBeenCalled()

      // Admin notifications still sent
      expect(mockNewTaskCreated).toHaveBeenCalledTimes(1)
      expect(mockNotifyAdminWhatsApp).toHaveBeenCalledTimes(1)

      // Fewer inserts: tasks + 1x activityLog (created only) + creditTransactions = 3
      expect(mockTx.insert).toHaveBeenCalledTimes(3)
      // Fewer updates: credits deduction only (no assignment update)
      expect(mockTx.update).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------
  // Happy Path: Task with attachments and briefId
  // -------------------------------------------------------------------
  describe('happy path: task created with attachments and brief linking', () => {
    it('saves attachments and links the brief to the new task', async () => {
      setupAuth()

      const bodyWithAttachments = {
        ...validBody,
        attachments: [
          {
            fileName: 'reference.png',
            fileUrl: 'https://storage.example.com/ref.png',
            fileType: 'image/png',
            fileSize: 2048,
          },
        ],
        briefId: 'brief-123',
      }

      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      const response = await POST(makeRequest(bodyWithAttachments) as never)
      expect(response.status).toBe(201)

      // Inserts: tasks + 1x activityLog + creditTransactions + taskFiles (attachments) = 4
      expect(mockTx.insert).toHaveBeenCalledTimes(4)

      // Updates: credits deduction + brief link = 2
      expect(mockTx.update).toHaveBeenCalledTimes(2)
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

      const data = await response.json()
      expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)

      // No DB operations should occur
      expect(mockWithTransaction).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Error: Validation failure
  // -------------------------------------------------------------------
  describe('error: validation failure', () => {
    it('returns 400 when request body fails Zod validation', async () => {
      setupAuth()

      const { createTaskSchema } = await import('@/lib/validations')
      const { ZodError } = await import('zod')
      ;(createTaskSchema.parse as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new ZodError([
          {
            code: 'too_small',
            minimum: 3,
            inclusive: true,
            exact: false,
            origin: 'string',
            type: 'string',
            message: 'Title must be at least 3 characters',
            path: ['title'],
          } as never,
        ])
      })

      const response = await POST(makeRequest({ title: 'X' }) as never)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error.message).toBe('Validation failed')

      // No transaction should start
      expect(mockWithTransaction).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Error: Insufficient credits
  // -------------------------------------------------------------------
  describe('error: insufficient credits', () => {
    it('returns 400 with INSUFFICIENT_CREDITS code when user lacks credits', async () => {
      setupAuth()

      const { mockTx } = buildTxMock({
        credits: 2, // Only 2 credits, needs 5
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error.code).toBe(ErrorCodes.INSUFFICIENT_CREDITS)

      // No task should be created
      expect(mockTx.insert).not.toHaveBeenCalled()

      // No notifications should be sent
      expect(mockNewTaskCreated).not.toHaveBeenCalled()
      expect(mockNotify).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Error: User not found
  // -------------------------------------------------------------------
  describe('error: user not found in transaction', () => {
    it('returns 404 when user lookup in transaction returns empty', async () => {
      setupAuth()

      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: vi.fn().mockResolvedValue([]), // No user found
            }),
          }),
        }),
        insert: vi.fn(),
        update: vi.fn(),
      }

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
    })
  })

  // -------------------------------------------------------------------
  // Error: Rate limited
  // -------------------------------------------------------------------
  describe('error: rate limited', () => {
    it('returns 429 with Retry-After header', async () => {
      mockCheckRateLimit.mockResolvedValue({ limited: true, resetIn: 45 })

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBe('45')

      const data = await response.json()
      expect(data.error).toBe('Too many requests')

      // No auth check or DB operations
      expect(mockRequireAuth).not.toHaveBeenCalled()
      expect(mockWithTransaction).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------
  // Resilience: Admin notification failure is non-fatal
  // -------------------------------------------------------------------
  describe('resilience: notification failures do not break task creation', () => {
    it('returns 201 even when admin email notification fails', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      // Admin notification throws
      mockNewTaskCreated.mockRejectedValueOnce(new Error('SMTP timeout'))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(201)

      // Error was logged
      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), taskId: 'task-new-1' }),
        'Failed to send admin email notification'
      )
    })

    it('returns 201 even when WhatsApp notification fails', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      mockNotifyAdminWhatsApp.mockRejectedValueOnce(new Error('WhatsApp API down'))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(201)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), taskId: 'task-new-1' }),
        'Failed to send admin WhatsApp notification'
      )
    })

    it('returns 201 even when artist notification fails', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([bestArtist])

      mockNotify.mockRejectedValueOnce(new Error('Notification service down'))

      const response = await POST(makeRequest(validBody) as never)
      expect(response.status).toBe(201)

      const { logger } = await import('@/lib/logger')
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), artistId: 'artist-1' }),
        'Failed to send artist assignment notification'
      )
    })
  })

  // -------------------------------------------------------------------
  // Side-effect verification: complexity and urgency detection
  // -------------------------------------------------------------------
  describe('side effects: complexity and urgency detection', () => {
    it('calls detectTaskComplexity and detectTaskUrgency with correct args', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: null,
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      const bodyWithDeadline = {
        ...validBody,
        deadline: '2026-03-15T00:00:00.000Z',
      }

      await POST(makeRequest(bodyWithDeadline) as never)

      expect(mockDetectTaskComplexity).toHaveBeenCalledWith(
        8, // estimatedHours
        2, // requiredSkills.length (from validBody.requirements.skills)
        'Design a modern landing page for our SaaS product'
      )
      expect(mockDetectTaskUrgency).toHaveBeenCalledWith(new Date('2026-03-15T00:00:00.000Z'))
    })
  })

  // -------------------------------------------------------------------
  // Side-effect verification: ranking algorithm called correctly
  // -------------------------------------------------------------------
  describe('side effects: artist ranking', () => {
    it('calls rankArtistsForTask with properly constructed TaskData', async () => {
      setupAuth()
      const { mockTx } = buildTxMock({
        credits: 50,
        companyId: null,
        categoryId: 'cat-web-design',
        task: newTask,
      })

      mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
      mockRankArtistsForTask.mockResolvedValue([])

      await POST(makeRequest(validBody) as never)

      expect(mockRankArtistsForTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-new-1',
          title: 'Landing Page Design',
          complexity: 'INTERMEDIATE',
          urgency: 'STANDARD',
          categorySlug: 'web-design',
          requiredSkills: ['UI Design', 'Figma'],
          clientId: 'client-1',
        }),
        1 // top 1 result
      )
    })
  })
})
