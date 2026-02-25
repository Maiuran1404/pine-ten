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
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  websiteProjects: {
    id: 'id',
    userId: 'userId',
    deliveryStatus: 'deliveryStatus',
    framerProjectUrl: 'framerProjectUrl',
    framerDeployedUrl: 'framerDeployedUrl',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock builder factory
const mockDeployToProduction = vi.fn()
const mockDisconnect = vi.fn()
vi.mock('@/lib/website/builders/builder-factory', () => ({
  createBuilder: vi.fn(() => ({
    deployToProduction: (...args: unknown[]) => mockDeployToProduction(...args),
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
    url: 'http://localhost/api/website-flow/delivery/deploy',
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

describe('POST /api/website-flow/delivery/deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FRAMER_API_KEY = 'test-framer-api-key'
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
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(403)
  })

  it('returns 400 when framerProjectUrl is null (not pushed yet)', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: null,
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('not been pushed to Framer')
  })

  it('returns 400 when delivery status is not PREVIEW_READY', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PUSHED',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('Cannot deploy')
    expect(data.error.message).toContain('PUSHED')
  })

  it('returns 400 when FRAMER_API_KEY is not configured', async () => {
    const user = setupAuth()
    delete process.env.FRAMER_API_KEY
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('Framer integration not configured')
  })

  it('deploys successfully and returns deployed URL', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    // Mock multiple db.update calls (DEPLOYING, then DEPLOYED)
    setupDbUpdate()
    setupDbUpdate()

    mockDeployToProduction.mockResolvedValue({
      success: true,
      deployedUrl: 'https://mysite.framer.website',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)
    expect(data.data.deployedUrl).toBe('https://mysite.framer.website')
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('sets status to FAILED when deploy returns success: false', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    // Mock multiple db.update calls (DEPLOYING, then FAILED)
    setupDbUpdate()
    setupDbUpdate()

    mockDeployToProduction.mockResolvedValue({
      success: false,
      deployedUrl: '',
      error: 'Deployment quota exceeded',
    })

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(false)
    expect(data.data.error).toBe('Deployment quota exceeded')
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('reverts status to PREVIEW_READY when builder throws an error', async () => {
    const user = setupAuth()
    setupDbSelect({
      id: validProjectId,
      userId: user.id,
      deliveryStatus: 'PREVIEW_READY',
      framerProjectUrl: 'https://framer.com/project/123',
    })

    // Mock multiple db.update calls (DEPLOYING, then revert to PREVIEW_READY)
    setupDbUpdate()
    setupDbUpdate()

    mockDeployToProduction.mockRejectedValue(new Error('Network error'))

    const response = await POST(makeRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(500)
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
