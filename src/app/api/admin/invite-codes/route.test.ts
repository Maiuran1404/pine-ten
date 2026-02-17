import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  createInviteCodeSchema: {
    safeParse: vi.fn((body: unknown) => ({ success: true, data: body })),
  },
  updateInviteCodeSchema: {
    safeParse: vi.fn((body: unknown) => ({ success: true, data: body })),
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
  earlyAccessCodes: {
    id: 'id',
    code: 'code',
    description: 'description',
    maxUses: 'maxUses',
    usedCount: 'usedCount',
    expiresAt: 'expiresAt',
    isActive: 'isActive',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
  },
  users: { id: 'id', name: 'name', email: 'email' },
}))

vi.mock('@/db/schema', () => ({}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

vi.mock('crypto', () => ({
  default: { randomInt: vi.fn().mockReturnValue(0) },
}))

const { GET, POST, PATCH, DELETE } = await import('./route')

function makeRequest(opts: { url?: string; body?: unknown } = {}) {
  return {
    url: opts.url || 'http://localhost/api/admin/invite-codes',
    method: 'POST',
    json: vi.fn().mockResolvedValue(opts.body || {}),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/invite-codes', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns invite codes with creator info', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              id: 'code-1',
              code: 'CRAFT-ABCD',
              isActive: true,
              usedCount: 3,
              creatorName: 'Admin',
            },
          ]),
        }),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.codes).toHaveLength(1)
    expect(data.data.codes[0].code).toBe('CRAFT-ABCD')
  })
})

describe('POST /api/admin/invite-codes', () => {
  it('creates an invite code', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    // Uniqueness check
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    // Insert
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: 'code-new', code: 'CRAFT-TEST', isActive: true }]),
      }),
    })

    const response = await POST(
      makeRequest({ body: { code: 'CRAFT-TEST', description: 'Test invite' } }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.code.code).toBe('CRAFT-TEST')
  })
})

describe('PATCH /api/admin/invite-codes', () => {
  it('returns 400 when code ID missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    const response = await PATCH(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Code ID')
  })

  it('updates an invite code', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'code-1', isActive: false }]),
        }),
      }),
    })

    const response = await PATCH(
      makeRequest({
        url: 'http://localhost/api/admin/invite-codes?id=code-1',
        body: { isActive: false },
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.code.isActive).toBe(false)
  })
})

describe('DELETE /api/admin/invite-codes', () => {
  it('returns 400 when code ID missing', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })

    const response = await DELETE(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Code ID')
  })

  it('soft deletes an invite code', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'code-1' }]),
        }),
      }),
    })

    const response = await DELETE(
      makeRequest({ url: 'http://localhost/api/admin/invite-codes?id=code-1' }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
