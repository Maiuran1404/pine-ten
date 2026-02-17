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
  testUsers: { id: 'id', isActive: 'isActive', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/security/test-users',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST, PUT, DELETE } = await import('./route')

describe('GET /api/admin/security/test-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should return list of test users without credentials', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockUsers = [
      {
        id: 'user-1',
        name: 'Test Client',
        email: 'client@test.com',
        role: 'CLIENT',
        credentials: { password: 'secret' },
      },
      {
        id: 'user-2',
        name: 'Test Freelancer',
        email: 'freelancer@test.com',
        role: 'FREELANCER',
        credentials: null,
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockUsers),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.testUsers).toHaveLength(2)
    // Credentials should be removed, replaced with hasCredentials flag
    expect(data.data.testUsers[0].hasCredentials).toBe(true)
    expect(data.data.testUsers[1].hasCredentials).toBe(false)
    expect(data.data.testUsers[0].credentials).toBeUndefined()
  })
})

describe('POST /api/admin/security/test-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new test user', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const newUser = {
      id: 'user-new',
      name: 'New User',
      email: 'new@test.com',
      role: 'CLIENT',
      credentials: { password: 'secret' },
    }

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newUser]),
      }),
    })

    const request = makeRequest({ name: 'New User', email: 'new@test.com', role: 'CLIENT' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.testUser.name).toBe('New User')
    expect(data.data.testUser.hasCredentials).toBe(true)
  })

  it('should return 400 when required fields missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ name: 'Test' }) // missing email and role
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/admin/security/test-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a test user', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/test-users?id=user-1',
    })
    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
