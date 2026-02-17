import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  updateNotificationSettingSchema: {
    parse: vi.fn((body: unknown) => body as Record<string, unknown>),
  },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  notificationSettings: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, PUT, POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/notifications',
    method: 'PUT',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/notifications', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns notification settings', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi
        .fn()
        .mockResolvedValue([{ id: 'ns-1', eventType: 'TASK_ASSIGNED', emailEnabled: true }]),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.settings).toHaveLength(1)
    expect(data.data.settings[0].eventType).toBe('TASK_ASSIGNED')
  })

  it('seeds defaults when no settings exist', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // First select returns empty
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([]),
    })
    // Insert defaults
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
    // Second select returns seeded data
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([
        { id: 'ns-1', eventType: 'TASK_ASSIGNED', emailEnabled: true },
        { id: 'ns-2', eventType: 'TASK_COMPLETED', emailEnabled: true },
      ]),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.settings).toHaveLength(2)
    expect(mockDbInsert).toHaveBeenCalled()
  })
})

describe('PUT /api/admin/notifications', () => {
  it('updates a notification setting', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await PUT(makeRequest({ id: 'ns-1', emailEnabled: false }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})

describe('POST /api/admin/notifications (reset)', () => {
  it('resets to defaults', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbDelete.mockReturnValue(vi.fn().mockResolvedValue(undefined))
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockResolvedValue([{ id: 'ns-new-1', eventType: 'TASK_ASSIGNED' }]),
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.message).toContain('defaults')
  })
})
