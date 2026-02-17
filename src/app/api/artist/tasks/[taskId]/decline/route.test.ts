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
  config: { app: { url: 'https://crafted.test' } },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  adminNotifications: { taskUnassignable: vi.fn().mockResolvedValue(undefined) },
}))

// Mock require-auth
const mockRequireRole = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

// Mock assignment algorithm
const mockRankArtistsForTask = vi.fn()
const mockGetPreviouslyOfferedArtists = vi.fn()
const mockGetActiveConfig = vi.fn()
vi.mock('@/lib/assignment-algorithm', () => ({
  rankArtistsForTask: (...args: unknown[]) => mockRankArtistsForTask(...args),
  getPreviouslyOfferedArtists: (...args: unknown[]) => mockGetPreviouslyOfferedArtists(...args),
  getActiveConfig: (...args: unknown[]) => mockGetActiveConfig(...args),
}))

// DB mocks
const mockWithTransaction = vi.fn()
vi.mock('@/db', () => ({
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    description: 'description',
    status: 'status',
    offeredTo: 'offeredTo',
    offerExpiresAt: 'offerExpiresAt',
    escalationLevel: 'escalationLevel',
    complexity: 'complexity',
    urgency: 'urgency',
    categoryId: 'categoryId',
    requiredSkills: 'requiredSkills',
    clientId: 'clientId',
    deadline: 'deadline',
  },
  taskOffers: { taskId: 'taskId', artistId: 'artistId', response: 'response' },
  taskActivityLog: {},
  taskCategories: { id: 'id', slug: 'slug' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: Record<string, unknown> = {}) {
  return {
    url: 'http://localhost/api/artist/tasks/task-1/decline',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function makeParams(taskId: string) {
  return { params: Promise.resolve({ taskId }) }
}

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'artist-1',
    name: 'Test Artist',
    email: 'artist@test.com',
    role: 'FREELANCER',
    ...overrides,
  }
  mockRequireRole.mockResolvedValue({ user })
  return user
}

const defaultAlgorithmConfig = {
  escalationSettings: {
    level1MaxOffers: 3,
    level2MaxOffers: 5,
    level3BroadcastMinutes: 60,
  },
  acceptanceWindows: {
    urgent: 30,
    standard: 120,
    low: 240,
  },
}

const baseTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'A task',
  status: 'OFFERED',
  offeredTo: 'artist-1',
  offerExpiresAt: null,
  escalationLevel: 1,
  complexity: 'INTERMEDIATE',
  urgency: 'STANDARD',
  categoryId: null,
  requiredSkills: [],
  clientId: 'client-1',
  deadline: null,
}

describe('POST /api/artist/tasks/[taskId]/decline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActiveConfig.mockResolvedValue(defaultAlgorithmConfig)
    mockGetPreviouslyOfferedArtists.mockResolvedValue(['artist-1'])
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireRole.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(401)
  })

  it('returns 404 when task not found', async () => {
    setupAuth()

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('nonexistent'))
    expect(response.status).toBe(404)
  })

  it('returns 403 when task is not offered to this user', async () => {
    setupAuth({ id: 'artist-1' })

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ ...baseTask, offeredTo: 'other-artist' }]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error.message).toContain('not offered to you')
  })

  it('returns 400 when offer status is not OFFERED', async () => {
    setupAuth({ id: 'artist-1' })

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ ...baseTask, status: 'ASSIGNED' }]),
          }),
        }),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(makeRequest() as never, makeParams('task-1'))
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('no longer valid')
  })

  it('successfully declines and re-offers to next artist', async () => {
    setupAuth({ id: 'artist-1' })

    const nextArtist = {
      artist: { userId: 'artist-2', name: 'Next Artist', email: 'next@test.com' },
      totalScore: 75,
      breakdown: {
        skillScore: 15,
        timezoneScore: 15,
        experienceScore: 15,
        workloadScore: 15,
        performanceScore: 15,
      },
      excluded: false,
    }

    mockRankArtistsForTask.mockResolvedValue([nextArtist])

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([baseTask]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(
      makeRequest({ reason: 'TOO_BUSY', note: 'Swamped this week' }) as never,
      makeParams('task-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe('Task declined')
    expect(data.data.nextAction).toBe('offered')
  })

  it('escalates to admin when no artists are available at max level', async () => {
    setupAuth({ id: 'artist-1' })

    mockRankArtistsForTask.mockResolvedValue([])
    mockGetPreviouslyOfferedArtists.mockResolvedValue(['artist-1', 'artist-2', 'artist-3'])

    const taskAtLevel3 = { ...baseTask, escalationLevel: 3 }

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([taskAtLevel3]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
    }

    mockWithTransaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    )

    const response = await POST(
      makeRequest({ reason: 'SKILL_MISMATCH' }) as never,
      makeParams('task-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.nextAction).toBe('escalated_to_admin')
  })
})
