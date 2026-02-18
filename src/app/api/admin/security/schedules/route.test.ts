import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  testSchedules: {
    id: 'id',
    isActive: 'isActive',
    createdAt: 'createdAt',
    testUserId: 'testUserId',
  },
  testUsers: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/security/schedules',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST, PUT: _PUT, DELETE } = await import('./route')

describe('GET /api/admin/security/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should return list of schedules', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockSchedules = [
      {
        schedule: { id: 'sched-1', name: 'Daily Auth', frequency: 'DAILY' },
        testUser: { id: 'user-1', name: 'Test User' },
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockSchedules),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.schedules).toHaveLength(1)
  })
})

describe('POST /api/admin/security/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new schedule', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const newSchedule = {
      id: 'sched-new',
      name: 'Daily Security Scan',
      frequency: 'DAILY',
    }

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newSchedule]),
      }),
    })

    const request = makeRequest({ name: 'Daily Security Scan', frequency: 'DAILY' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.schedule.name).toBe('Daily Security Scan')
  })

  it('should return 400 when name missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ frequency: 'DAILY' })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should create manual schedule with no next run', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const newSchedule = {
      id: 'sched-manual',
      name: 'Manual Run',
      frequency: 'MANUAL',
      nextRunAt: null,
    }

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newSchedule]),
      }),
    })

    const request = makeRequest({ name: 'Manual Run', frequency: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.schedule.frequency).toBe('MANUAL')
  })
})

describe('DELETE /api/admin/security/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a schedule', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/schedules?id=sched-1',
    })
    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('should return 400 when id missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/schedules' })
    const response = await DELETE(request)

    expect(response.status).toBe(400)
  })
})
