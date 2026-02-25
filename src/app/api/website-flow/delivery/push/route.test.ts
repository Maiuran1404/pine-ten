import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock require-auth
const mockRequireClient = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireClient: (...args: unknown[]) => mockRequireClient(...args),
}))

// DB mocks
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockExecute = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  websiteProjects: {
    id: 'id',
    userId: 'userId',
    status: 'status',
    skeleton: 'skeleton',
    deliveryStatus: 'deliveryStatus',
    framerProjectUrl: 'framerProjectUrl',
    framerPreviewUrl: 'framerPreviewUrl',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  sql: vi.fn(),
}))

// Mock builder factory
const mockPushSkeleton = vi.fn()
const mockApplyStyles = vi.fn()
const mockDisconnect = vi.fn()
vi.mock('@/lib/website/builders/builder-factory', () => ({
  createBuilder: vi.fn(() => ({
    pushSkeleton: (...args: unknown[]) => mockPushSkeleton(...args),
    applyStyles: (...args: unknown[]) => mockApplyStyles(...args),
    disconnect: (...args: unknown[]) => mockDisconnect(...args),
  })),
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/website-flow/delivery/push',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CLIENT',
    ...overrides,
  }
  mockRequireClient.mockResolvedValue({ user })
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

function setupDbUpdate() {
  const setMock = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })
  mockUpdate.mockReturnValue({
    set: setMock,
  })
  return setMock
}

const validProjectId = '00000000-0000-4000-8000-000000000001'
const validTemplateId = '00000000-0000-4000-8000-000000000099'

const validSkeleton = {
  sections: [
    {
      id: 'section-1',
      type: 'hero',
      title: 'Welcome',
      description: 'Hero section',
      order: 0,
      content: { headline: 'Hello World' },
    },
    {
      id: 'section-2',
      type: 'features',
      title: 'Features',
      description: 'Feature section',
      order: 1,
      content: {},
    },
  ],
  globalStyles: {
    primaryColor: '#3B82F6',
    fontPrimary: 'Inter',
  },
}

describe('POST /api/website-flow/delivery/push', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FRAMER_API_KEY = 'test-framer-api-key'
    process.env.FRAMER_TEMPLATE_PROJECT_URL = 'https://framer.com/template/default'
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireClient.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 for invalid projectId (not a UUID)', async () => {
    setupAuth()

    const response = await POST(makeRequest({ projectId: 'not-a-uuid' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 when projectId is missing', async () => {
    setupAuth()

    const response = await POST(makeRequest({}) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid templateId (not a UUID)', async () => {
    setupAuth()

    const response = await POST(
      makeRequest({ projectId: validProjectId, templateId: 'bad-id' }) as never
    )
    expect(response.status).toBe(400)
  })

  it('returns 404 when project not found', async () => {
    setupAuth()
    setupDbSelect(null)

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.message).toContain('Website project')
  })

  it('returns 403 when user does not own the project', async () => {
    setupAuth({ id: 'other-user' })
    setupDbSelect({
      id: validProjectId,
      userId: 'owner-user',
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(403)
  })

  it('returns 400 when project is not in APPROVED status', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'DRAFT',
      skeleton: validSkeleton,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('must be approved')
  })

  it('returns 400 when skeleton is null', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: null,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('No skeleton')
  })

  it('returns 400 when skeleton has empty sections', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: { sections: [], globalStyles: {} },
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('No skeleton')
  })

  it('returns 400 when FRAMER_API_KEY is not configured', async () => {
    const user = setupAuth()
    delete process.env.FRAMER_API_KEY
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('Framer integration not configured')
  })

  it('returns 400 when no template URL is available', async () => {
    const user = setupAuth()
    delete process.env.FRAMER_TEMPLATE_PROJECT_URL
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('No Framer template available')
  })

  it('pushes skeleton successfully using default template', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    // Mock multiple db.update calls (PUSHING, then PUSHED)
    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockResolvedValue({
      success: true,
      projectUrl: 'https://framer.com/template/default',
      previewUrl: 'https://preview.framer.website/abc',
    })
    mockApplyStyles.mockResolvedValue(undefined)

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)
    expect(data.data.previewUrl).toBe('https://preview.framer.website/abc')
    expect(mockApplyStyles).toHaveBeenCalled()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('looks up template by templateId when provided', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    // db.execute for template lookup
    mockExecute.mockResolvedValue([{ framer_project_url: 'https://framer.com/template/custom' }])

    // Mock multiple db.update calls
    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockResolvedValue({
      success: true,
      projectUrl: 'https://framer.com/template/custom',
      previewUrl: 'https://preview.framer.website/xyz',
    })
    mockApplyStyles.mockResolvedValue(undefined)

    const response = await POST(
      makeRequest({ projectId: validProjectId, templateId: validTemplateId }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockExecute).toHaveBeenCalled()
  })

  it('falls back to default template when templateId lookup returns empty', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    // db.execute returns empty array (no matching template)
    mockExecute.mockResolvedValue([])

    // Mock multiple db.update calls
    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockResolvedValue({
      success: true,
      projectUrl: 'https://framer.com/template/default',
      previewUrl: 'https://preview.framer.website/fallback',
    })
    mockApplyStyles.mockResolvedValue(undefined)

    const response = await POST(
      makeRequest({ projectId: validProjectId, templateId: validTemplateId }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('sets status to FAILED when pushSkeleton returns success: false', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockResolvedValue({
      success: false,
      projectUrl: '',
      error: 'Framer API rate limit',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(false)
    expect(data.data.error).toBe('Framer API rate limit')
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('sets status to FAILED when builder throws an error', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: validSkeleton,
    })

    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockRejectedValue(new Error('Connection timeout'))

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(500)
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('does not apply global styles when skeleton has no globalStyles', async () => {
    const user = setupAuth()
    const skeletonNoStyles = {
      sections: [
        {
          id: 's1',
          type: 'hero',
          title: 'Hero',
          description: 'Hero section',
          order: 0,
        },
      ],
    }
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      status: 'APPROVED',
      skeleton: skeletonNoStyles,
    })

    setupDbUpdate()
    setupDbUpdate()

    mockPushSkeleton.mockResolvedValue({
      success: true,
      projectUrl: 'https://framer.com/template/default',
      previewUrl: 'https://preview.framer.website/no-styles',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockApplyStyles).not.toHaveBeenCalled()
  })
})
