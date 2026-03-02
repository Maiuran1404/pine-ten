import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'https://crafted.test' },
    rateLimits: { api: 100 },
    tasks: { defaultMaxRevisions: 3 },
    uploads: { maxFileSizeMB: 50 },
  },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  adminNotifications: { newTaskCreated: vi.fn().mockResolvedValue(undefined) },
  notifyAdminWhatsApp: vi.fn().mockResolvedValue(undefined),
  adminWhatsAppTemplates: { newTaskCreated: vi.fn().mockReturnValue('whatsapp msg') },
}))

vi.mock('@/lib/notifications/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    taskAssignedToClient: vi.fn().mockReturnValue({ subject: 'Assigned', html: '<p>hi</p>' }),
  },
}))

// Mock rate limit
const mockCheckRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// Mock require-auth
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

// Mock assignment algorithm
const mockRankArtistsForTask = vi.fn()
const mockDetectTaskComplexity = vi.fn()
const mockDetectTaskUrgency = vi.fn()
vi.mock('@/lib/assignment-algorithm', () => ({
  rankArtistsForTask: (...args: unknown[]) => mockRankArtistsForTask(...args),
  detectTaskComplexity: (...args: unknown[]) => mockDetectTaskComplexity(...args),
  detectTaskUrgency: (...args: unknown[]) => mockDetectTaskUrgency(...args),
}))

// Mock deadline calculations
vi.mock('@/lib/deadline', () => ({
  calculateDeliveryDays: vi.fn().mockReturnValue(3),
  calculateDeadlineFromNow: vi.fn().mockReturnValue(new Date('2025-02-25T00:00:00Z')),
}))

// Mock validations
vi.mock('@/lib/validations', () => ({
  createTaskSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

// DB mocks
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockWithTransaction = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
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
  },
  taskCategories: { id: 'id', slug: 'slug' },
  taskFiles: {
    taskId: 'taskId',
    fileUrl: 'fileUrl',
    fileName: 'fileName',
    fileType: 'fileType',
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

const { GET, POST } = await import('./route')

function makeRequest(body?: unknown, options: { url?: string; method?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/tasks',
    method: options.method || 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

/**
 * Build a deeply chainable mock where every method returns the same proxy
 * and the whole thing is also thenable (resolves to `result`).
 */
function chainableSelect(result: unknown[]) {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result)
      }
      return vi.fn().mockReturnValue(new Proxy({}, handler))
    },
  }
  return new Proxy({}, handler)
}

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CLIENT',
    ...overrides,
  }
  mockRequireAuth.mockResolvedValue({ user })
  return user
}

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockReturnValue({ limited: false, resetIn: 0 })
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, resetIn: 30 })

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks' }) as never
    )
    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.error).toBe('Too many requests')
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks' }) as never
    )
    expect(response.status).toBe(401)
  })

  it('returns tasks for client role', async () => {
    setupAuth({ role: 'CLIENT' })

    const taskList = [
      {
        id: 'task-1',
        title: 'Test Task',
        description: 'A test',
        status: 'PENDING',
        clientId: 'user-1',
        categoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creditsUsed: 5,
        estimatedHours: '2',
        deadline: null,
        priority: 0,
        requirements: null,
        assignedAt: null,
        completedAt: null,
        freelancerId: null,
        freelancerName: null,
        freelancerImage: null,
      },
    ]

    // 1st: task list query
    mockSelect.mockReturnValueOnce(chainableSelect(taskList))
    // 2nd: image attachments
    mockSelect.mockReturnValueOnce(chainableSelect([]))
    // 3rd-5th: parallel stats (active count, completed count, credits sum)
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 1 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ total: 5 }]))

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.tasks).toHaveLength(1)
    expect(data.data.tasks[0].title).toBe('Test Task')
  })

  it('returns tasks for freelancer role', async () => {
    setupAuth({ role: 'FREELANCER' })

    const taskList = [
      {
        id: 'task-2',
        title: 'Freelancer Task',
        description: 'Assigned',
        status: 'ASSIGNED',
        clientId: 'client-1',
        categoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creditsUsed: 3,
        estimatedHours: '1',
        deadline: null,
        priority: 0,
        requirements: null,
        assignedAt: new Date(),
        completedAt: null,
        freelancerId: 'user-1',
        freelancerName: 'Test User',
        freelancerImage: null,
      },
    ]

    mockSelect.mockReturnValueOnce(chainableSelect(taskList))
    mockSelect.mockReturnValueOnce(chainableSelect([]))
    // Parallel stats: active count, completed count, credits sum
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ total: 0 }]))

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks?view=freelancer' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tasks).toHaveLength(1)
    expect(data.data.tasks[0].freelancer).toBeTruthy()
    expect(data.data.tasks[0].freelancer.id).toBe('user-1')
  })

  it('admin sees all tasks', async () => {
    setupAuth({ role: 'ADMIN' })

    // 1st: task list (empty => image attachments query is skipped)
    mockSelect.mockReturnValueOnce(chainableSelect([]))
    // 2nd-4th: parallel stats (active, completed, credits)
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ total: 0 }]))

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks' }) as never
    )

    expect(response.status).toBe(200)
  })

  it('pagination works via query params', async () => {
    setupAuth()

    // 1st: task list (empty => image attachments query is skipped)
    mockSelect.mockReturnValueOnce(chainableSelect([]))
    // 2nd-4th: parallel stats (active, completed, credits)
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 0 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ total: 0 }]))

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks?limit=5&offset=10' }) as never
    )

    expect(response.status).toBe(200)
  })

  it('includes stats in response', async () => {
    setupAuth()

    const taskList = [
      {
        id: 'task-s1',
        title: 'Stats Task',
        description: 'For stats test',
        status: 'IN_PROGRESS',
        clientId: 'user-1',
        categoryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creditsUsed: 10,
        estimatedHours: null,
        deadline: null,
        priority: 0,
        requirements: null,
        assignedAt: null,
        completedAt: null,
        freelancerId: null,
        freelancerName: null,
        freelancerImage: null,
      },
    ]

    // 1st: task list (non-empty so image query runs)
    mockSelect.mockReturnValueOnce(chainableSelect(taskList))
    // 2nd: image attachments
    mockSelect.mockReturnValueOnce(chainableSelect([]))
    // 3rd-5th: parallel stats (active count, completed count, credits sum)
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 3 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ count: 7 }]))
    mockSelect.mockReturnValueOnce(chainableSelect([{ total: 42 }]))

    const response = await GET(
      makeRequest(undefined, { url: 'http://localhost/api/tasks' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.stats).toBeDefined()
    expect(data.data.stats.activeTasks).toBe(3)
    expect(data.data.stats.completedTasks).toBe(7)
    expect(data.data.stats.totalCreditsUsed).toBe(42)
  })
})

describe('POST /api/tasks', () => {
  const validBody = {
    title: 'New Design Task',
    description: 'Design a landing page with modern style',
    creditsRequired: 5,
    category: 'web-design',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockReturnValue({ limited: false, resetIn: 0 })
    mockDetectTaskComplexity.mockReturnValue('INTERMEDIATE')
    mockDetectTaskUrgency.mockReturnValue('STANDARD')
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, resetIn: 60 })

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(429)
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 for validation error (invalid body)', async () => {
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

    const response = await POST(makeRequest({ title: 'Ab' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for insufficient credits', async () => {
    setupAuth()

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ credits: 2, companyId: null }]),
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
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe(ErrorCodes.INSUFFICIENT_CREDITS)
  })

  it('successfully creates a task with assignment', async () => {
    setupAuth()

    const newTask = {
      id: 'task-new',
      title: 'New Design Task',
      status: 'PENDING',
      clientId: 'user-1',
    }

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ credits: 50, companyId: 'company-1' }]),
            limit: vi.fn().mockResolvedValue([{ id: 'cat-1' }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTask]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )
    mockRankArtistsForTask.mockResolvedValue([
      {
        artist: { userId: 'artist-1', name: 'Best Artist', email: 'artist@test.com' },
        totalScore: 85,
        breakdown: {
          skillScore: 20,
          timezoneScore: 15,
          experienceScore: 20,
          workloadScore: 15,
          performanceScore: 15,
        },
        excluded: false,
      },
    ])

    // Mock the post-transaction db.select for client email lookup
    mockSelect.mockReturnValueOnce(
      chainableSelect([{ name: 'Test User', email: 'test@example.com' }])
    )

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.taskId).toBe('task-new')
    expect(data.data.status).toBe('ASSIGNED')
    expect(data.data.assignedTo).toBe('Best Artist')
  })

  it('notification failure is non-fatal', async () => {
    setupAuth()

    const newTask = {
      id: 'task-notif-fail',
      title: 'Notif Test',
      status: 'PENDING',
      clientId: 'user-1',
    }

    // Track tx.select call count to return different results
    let txSelectCount = 0
    const mockTx = {
      select: vi.fn().mockImplementation(() => {
        txSelectCount++
        if (txSelectCount === 1) {
          // User credits query: select().from(users).where().for('update')
          return chainableSelect([{ credits: 50, companyId: null }])
        }
        if (txSelectCount === 2) {
          // Category query: select().from(taskCategories).where().limit()
          return chainableSelect([])
        }
        // Fallback artist query: select().from(freelancerProfiles).innerJoin().where().limit()
        return chainableSelect([])
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTask]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )
    mockRankArtistsForTask.mockResolvedValue([])

    // Admin notification throws
    const { adminNotifications } = await import('@/lib/notifications')
    ;(adminNotifications.newTaskCreated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Email service down')
    )

    const response = await POST(makeRequest(validBody) as never)

    // Still returns 201 despite notification failure
    expect(response.status).toBe(201)
  })
})
