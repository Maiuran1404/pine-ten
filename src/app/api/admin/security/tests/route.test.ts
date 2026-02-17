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
  securityTests: { id: 'id', category: 'category', isActive: 'isActive', createdAt: 'createdAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/security/tests',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { GET, POST, PUT, DELETE } = await import('./route')

describe('GET /api/admin/security/tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return list of security tests', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockTests = [
      { id: 'test-1', name: 'Auth test', category: 'auth', testType: 'deterministic' },
      { id: 'test-2', name: 'API test', category: 'api', testType: 'exploratory' },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockTests),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.tests).toEqual(mockTests)
  })
})

describe('POST /api/admin/security/tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({ name: 'Test', category: 'auth', testType: 'deterministic' })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should create a new security test', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const newTest = {
      id: 'test-new',
      name: 'New Test',
      category: 'auth',
      testType: 'deterministic',
      severity: 'medium',
    }

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newTest]),
      }),
    })

    const request = makeRequest({
      name: 'New Test',
      category: 'auth',
      testType: 'deterministic',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.test.name).toBe('New Test')
  })

  it('should return 400 when required fields missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ name: 'Test' }) // missing category and testType
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('PUT /api/admin/security/tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a security test', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const updatedTest = { id: 'test-1', name: 'Updated Test', category: 'auth' }

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedTest]),
        }),
      }),
    })

    const request = makeRequest({ id: 'test-1', name: 'Updated Test' })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.test.name).toBe('Updated Test')
  })

  it('should return 400 when id missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({ name: 'Updated Test' })
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/admin/security/tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a security test', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/security/tests?id=test-1',
    })
    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })

  it('should return 400 when id query param missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/security/tests' })
    const response = await DELETE(request)

    expect(response.status).toBe(400)
  })
})
