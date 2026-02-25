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
  websiteProjects: {
    id: 'id',
    userId: 'userId',
    companyId: 'companyId',
    taskId: 'taskId',
    phase: 'phase',
    status: 'status',
    selectedInspirations: 'selectedInspirations',
    userNotes: 'userNotes',
    skeleton: 'skeleton',
    chatHistory: 'chatHistory',
    skeletonStage: 'skeletonStage',
    timeline: 'timeline',
    deliveryStatus: 'deliveryStatus',
    framerProjectUrl: 'framerProjectUrl',
    framerPreviewUrl: 'framerPreviewUrl',
    framerDeployedUrl: 'framerDeployedUrl',
    creditsUsed: 'creditsUsed',
    approvedAt: 'approvedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const { GET } = await import('./route')

function makeRequest(url = 'http://localhost/api/website-flow/projects/proj-1') {
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

function setupDbSelect(project: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(project ? [project] : []),
      }),
    }),
  })
}

const validProjectId = '00000000-0000-4000-8000-000000000001'

describe('GET /api/website-flow/projects/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Auth Guard ----

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    expect(response.status).toBe(401)
  })

  // ---- Not Found ----

  it('returns 404 when project not found', async () => {
    setupAuth()
    setupDbSelect(null)

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.message).toContain('Website project')
  })

  // ---- Ownership / Permissions ----

  it('returns 403 when user is not the owner and not admin', async () => {
    setupAuth({ id: 'other-user', role: 'CLIENT' })
    setupDbSelect({
      id: validProjectId,
      userId: 'owner-user',
      phase: 'INSPIRATION',
      status: 'DRAFT',
      deliveryStatus: 'PENDING',
    })

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error.message).toContain('permission')
  })

  it('returns 403 when user is a freelancer and not the owner', async () => {
    setupAuth({ id: 'freelancer-user', role: 'FREELANCER' })
    setupDbSelect({
      id: validProjectId,
      userId: 'owner-user',
      phase: 'SKELETON',
      status: 'APPROVED',
      deliveryStatus: 'PUSHED',
    })

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    expect(response.status).toBe(403)
  })

  // ---- Happy Paths ----

  it('returns project for the owner', async () => {
    const user = setupAuth({ id: 'owner-user', role: 'CLIENT' })
    const project = {
      id: validProjectId,
      userId: user.id,
      companyId: null,
      taskId: null,
      phase: 'SKELETON',
      status: 'APPROVED',
      selectedInspirations: ['insp-1', 'insp-2'],
      userNotes: 'Make it modern',
      skeleton: {
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', description: 'Hero section', order: 0 },
        ],
      },
      chatHistory: [],
      skeletonStage: 'INITIAL_GENERATION',
      timeline: null,
      deliveryStatus: 'PENDING',
      framerProjectUrl: null,
      framerPreviewUrl: null,
      framerDeployedUrl: null,
      creditsUsed: 0,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setupDbSelect(project)

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe(validProjectId)
    expect(data.data.userId).toBe(user.id)
    expect(data.data.phase).toBe('SKELETON')
    expect(data.data.status).toBe('APPROVED')
  })

  it('admin can view any project', async () => {
    setupAuth({ id: 'admin-user', role: 'ADMIN' })
    const project = {
      id: validProjectId,
      userId: 'some-other-user',
      companyId: null,
      taskId: 'task-1',
      phase: 'DELIVERY',
      status: 'APPROVED',
      selectedInspirations: [],
      userNotes: null,
      skeleton: null,
      chatHistory: [],
      skeletonStage: 'INITIAL_GENERATION',
      timeline: null,
      deliveryStatus: 'DEPLOYED',
      framerProjectUrl: 'https://framer.com/project/123',
      framerPreviewUrl: 'https://preview.framer.website/abc',
      framerDeployedUrl: 'https://mysite.framer.website',
      creditsUsed: 5,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setupDbSelect(project)

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe(validProjectId)
    expect(data.data.deliveryStatus).toBe('DEPLOYED')
    expect(data.data.framerDeployedUrl).toBe('https://mysite.framer.website')
  })

  it('returns full project data with delivery fields', async () => {
    const user = setupAuth()
    const project = {
      id: validProjectId,
      userId: user.id,
      companyId: 'company-1',
      taskId: 'task-42',
      phase: 'DELIVERY',
      status: 'APPROVED',
      selectedInspirations: ['insp-a'],
      userNotes: 'Clean and modern',
      skeleton: {
        sections: [
          { id: 's1', type: 'hero', title: 'Hero', description: 'Main hero', order: 0 },
          { id: 's2', type: 'features', title: 'Features', description: 'Feature list', order: 1 },
        ],
        globalStyles: { primaryColor: '#3B82F6', fontPrimary: 'Inter' },
      },
      chatHistory: [{ role: 'user', content: 'hello' }],
      skeletonStage: 'FINALIZED',
      timeline: { weeks: 2 },
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/456',
      framerPreviewUrl: 'https://preview.framer.website/xyz',
      framerDeployedUrl: null,
      creditsUsed: 3,
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setupDbSelect(project)

    const response = await GET(makeRequest() as never, makeParams(validProjectId))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.deliveryStatus).toBe('PREVIEW_READY')
    expect(data.data.framerProjectUrl).toBe('https://framer.com/project/456')
    expect(data.data.framerPreviewUrl).toBe('https://preview.framer.website/xyz')
    expect(data.data.skeleton.sections).toHaveLength(2)
    expect(data.data.skeleton.globalStyles.primaryColor).toBe('#3B82F6')
  })

  // ---- Edge Cases ----

  it('works with any string as the id param (no UUID validation on GET)', async () => {
    const user = setupAuth()
    const project = {
      id: 'some-non-uuid-id',
      userId: user.id,
      phase: 'INSPIRATION',
      status: 'DRAFT',
      deliveryStatus: 'PENDING',
      selectedInspirations: [],
      chatHistory: [],
      skeleton: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setupDbSelect(project)

    const response = await GET(makeRequest() as never, makeParams('some-non-uuid-id'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.id).toBe('some-non-uuid-id')
  })
})
