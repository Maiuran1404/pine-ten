import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock require-auth
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

// DB mocks
const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    description: 'description',
    status: 'status',
    requirements: 'requirements',
    styleReferences: 'styleReferences',
    moodboardItems: 'moodboardItems',
    chatHistory: 'chatHistory',
    estimatedHours: 'estimatedHours',
    creditsUsed: 'creditsUsed',
    maxRevisions: 'maxRevisions',
    revisionsUsed: 'revisionsUsed',
    priority: 'priority',
    deadline: 'deadline',
    assignedAt: 'assignedAt',
    completedAt: 'completedAt',
    createdAt: 'createdAt',
    clientId: 'clientId',
    freelancerId: 'freelancerId',
    categoryId: 'categoryId',
  },
  users: { id: 'id', name: 'name', image: 'image', companyId: 'companyId', email: 'email' },
  taskCategories: { id: 'id', name: 'name', slug: 'slug' },
  taskFiles: {
    taskId: 'taskId',
    id: 'id',
    createdAt: 'createdAt',
    isDeliverable: 'isDeliverable',
    fileName: 'fileName',
    fileUrl: 'fileUrl',
    fileType: 'fileType',
    fileSize: 'fileSize',
  },
  taskMessages: {
    id: 'id',
    content: 'content',
    attachments: 'attachments',
    createdAt: 'createdAt',
    senderId: 'senderId',
    taskId: 'taskId',
  },
  companies: { id: 'id' },
  briefs: {
    id: 'id',
    status: 'status',
    completionPercentage: 'completionPercentage',
    taskSummary: 'taskSummary',
    topic: 'topic',
    platform: 'platform',
    contentType: 'contentType',
    intent: 'intent',
    taskType: 'taskType',
    audience: 'audience',
    dimensions: 'dimensions',
    visualDirection: 'visualDirection',
    contentOutline: 'contentOutline',
    brandContext: 'brandContext',
    draftId: 'draftId',
    taskId: 'taskId',
  },
  chatDrafts: {
    id: 'id',
    briefingState: 'briefingState',
  },
  taskActivityLog: {
    id: 'id',
    action: 'action',
    actorType: 'actorType',
    actorId: 'actorId',
    previousStatus: 'previousStatus',
    newStatus: 'newStatus',
    metadata: 'metadata',
    createdAt: 'createdAt',
    taskId: 'taskId',
  },
  websiteProjects: {
    id: 'id',
    taskId: 'taskId',
    deliveryStatus: 'deliveryStatus',
    framerProjectUrl: 'framerProjectUrl',
    framerPreviewUrl: 'framerPreviewUrl',
    framerDeployedUrl: 'framerDeployedUrl',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  ne: vi.fn(),
}))

const { GET } = await import('./route')

function makeRequest(url = 'http://localhost/api/tasks/task-1') {
  return {
    url,
    method: 'GET',
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
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

// The task detail route makes many parallel queries after the main task fetch.
// We need to mock sequential calls to db.select() carefully.
function setupTaskFound(
  taskRow: Record<string, unknown>,
  options: {
    clientCompanyId?: string | null
    files?: unknown[]
    messages?: unknown[]
    activityLog?: unknown[]
    brandResult?: unknown[]
    previousWork?: unknown[]
    previousDeliverables?: unknown[]
  } = {}
) {
  const {
    clientCompanyId = null,
    files = [],
    messages = [],
    activityLog = [],
    brandResult = [],
    previousWork = [],
    previousDeliverables = [],
  } = options

  // 1st select: main task query with LEFT JOINs
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([taskRow]),
          }),
        }),
      }),
    }),
  })

  // 2nd select: client info (companyId)
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ companyId: clientCompanyId }]),
      }),
    }),
  })

  // 3rd select: files
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(files),
      }),
    }),
  })

  // 4th select: messages
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(messages),
        }),
      }),
    }),
  })

  // 5th select: activity log
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(activityLog),
      }),
    }),
  })

  // 6th select: brand/company info (only if companyId)
  if (clientCompanyId) {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(brandResult),
        }),
      }),
    })
  }

  // 7th select: previous work (only if companyId)
  if (clientCompanyId) {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(previousWork),
              }),
            }),
          }),
        }),
      }),
    })
  }

  // 8th select: brief data (always runs, after conditional brand/previousWork)
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  })

  // 9th select: website project (always runs)
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  })

  // 10th select: previous deliverables (only if previousWork has items)
  if (previousWork.length > 0) {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(previousDeliverables),
        }),
      }),
    })
  }
}

describe('GET /api/tasks/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns 404 when task not found', async () => {
    setupAuth()

    // Task query returns empty
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    const response = await GET(makeRequest() as never, makeParams('nonexistent'))
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.message).toContain('Task not found')
  })

  it('returns 403 when user is not owner, freelancer, or admin', async () => {
    setupAuth({ id: 'other-user', role: 'CLIENT' })

    const taskRow = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Desc',
      status: 'PENDING',
      clientId: 'owner-user',
      freelancerId: 'artist-user',
      categoryId: null,
      categoryDbId: null,
      categoryName: null,
      categorySlug: null,
      freelancerDbId: null,
      freelancerName: null,
      freelancerImage: null,
    }

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([taskRow]),
            }),
          }),
        }),
      }),
    })

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
  })

  it('admin can view any task', async () => {
    setupAuth({ id: 'admin-user', role: 'ADMIN' })

    const taskRow = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Desc',
      status: 'PENDING',
      requirements: null,
      styleReferences: [],
      moodboardItems: [],
      chatHistory: [],
      estimatedHours: '2',
      creditsUsed: 5,
      maxRevisions: 3,
      revisionsUsed: 0,
      priority: 'NORMAL',
      deadline: null,
      assignedAt: null,
      completedAt: null,
      createdAt: new Date(),
      clientId: 'someone-else',
      freelancerId: null,
      categoryId: null,
      categoryDbId: null,
      categoryName: null,
      categorySlug: null,
      freelancerDbId: null,
      freelancerName: null,
      freelancerImage: null,
    }

    setupTaskFound(taskRow)

    const response = await GET(makeRequest() as never, makeParams('task-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.task.id).toBe('task-1')
  })

  it('response includes files, messages, activityLog, and brandDNA', async () => {
    setupAuth({ id: 'owner-user', role: 'CLIENT' })

    const taskRow = {
      id: 'task-2',
      title: 'Full Task',
      description: 'Full description',
      status: 'ASSIGNED',
      requirements: { skills: ['design'] },
      styleReferences: ['ref1'],
      moodboardItems: ['mood1'],
      chatHistory: [{ role: 'user', content: 'hello' }],
      estimatedHours: '4',
      creditsUsed: 10,
      maxRevisions: 3,
      revisionsUsed: 1,
      priority: 'HIGH',
      deadline: new Date(),
      assignedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      clientId: 'owner-user',
      freelancerId: 'artist-1',
      categoryId: 'cat-1',
      categoryDbId: 'cat-1',
      categoryName: 'Web Design',
      categorySlug: 'web-design',
      freelancerDbId: 'artist-1',
      freelancerName: 'Jane Artist',
      freelancerImage: 'https://example.com/avatar.png',
    }

    const files = [
      {
        id: 'file-1',
        taskId: 'task-2',
        fileName: 'design.png',
        fileUrl: 'https://cdn.example.com/design.png',
      },
    ]
    const messages = [
      {
        id: 'msg-1',
        content: 'Hello',
        attachments: [],
        createdAt: new Date(),
        senderId: 'owner-user',
        senderName: 'Test User',
        senderImage: null,
      },
    ]
    const activityLog = [
      {
        id: 'log-1',
        action: 'created',
        actorType: 'client',
        actorId: 'owner-user',
        previousStatus: null,
        newStatus: 'PENDING',
        metadata: {},
        createdAt: new Date(),
      },
    ]
    const brandResult = [
      {
        name: 'Acme Corp',
        website: 'https://acme.com',
        industry: 'Tech',
        description: 'A tech company',
        logoUrl: 'https://cdn.example.com/logo.png',
        faviconUrl: null,
        primaryColor: '#0000FF',
        secondaryColor: '#FF0000',
        accentColor: null,
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        brandColors: [],
        primaryFont: 'Inter',
        secondaryFont: null,
        socialLinks: {},
        brandAssets: [],
        tagline: 'We build things',
        keywords: ['tech', 'saas'],
      },
    ]

    setupTaskFound(taskRow, {
      clientCompanyId: 'company-1',
      files,
      messages,
      activityLog,
      brandResult,
    })

    const response = await GET(makeRequest() as never, makeParams('task-2'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.task.files).toHaveLength(1)
    expect(data.data.task.messages).toHaveLength(1)
    expect(data.data.task.activityLog).toHaveLength(1)
    expect(data.data.task.brandDNA).toBeTruthy()
    expect(data.data.task.brandDNA.name).toBe('Acme Corp')
    expect(data.data.task.category).toBeTruthy()
    expect(data.data.task.category.slug).toBe('web-design')
    expect(data.data.task.freelancer).toBeTruthy()
    expect(data.data.task.freelancer.name).toBe('Jane Artist')
  })

  it('client owner can view their own task', async () => {
    setupAuth({ id: 'owner-user', role: 'CLIENT' })

    const taskRow = {
      id: 'task-3',
      title: 'My Task',
      description: 'Mine',
      status: 'PENDING',
      requirements: null,
      styleReferences: [],
      moodboardItems: [],
      chatHistory: [],
      estimatedHours: null,
      creditsUsed: 3,
      maxRevisions: 3,
      revisionsUsed: 0,
      priority: 'NORMAL',
      deadline: null,
      assignedAt: null,
      completedAt: null,
      createdAt: new Date(),
      clientId: 'owner-user',
      freelancerId: null,
      categoryId: null,
      categoryDbId: null,
      categoryName: null,
      categorySlug: null,
      freelancerDbId: null,
      freelancerName: null,
      freelancerImage: null,
    }

    setupTaskFound(taskRow)

    const response = await GET(makeRequest() as never, makeParams('task-3'))
    expect(response.status).toBe(200)
  })
})
