import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireRole = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}))

const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mockDbUpdate(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', companyId: 'companyId' },
  companies: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/brand/reset-onboarding', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireRole.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST()
    expect(response.status).toBe(401)
  })

  it('resets onboarding and deletes company', async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com', companyId: 'company-1' },
    })
    // Delete company
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    // Update user
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockDbDelete).toHaveBeenCalled()
    expect(mockDbUpdate).toHaveBeenCalled()
  })

  it('resets onboarding without company delete when no company', async () => {
    mockRequireRole.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com', companyId: null },
    })
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockDbDelete).not.toHaveBeenCalled()
  })

  it('allows ADMIN role to reset onboarding', async () => {
    mockRequireRole.mockResolvedValue({
      user: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'ADMIN',
        companyId: 'company-1',
      },
    })
    mockDbDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })
    mockDbUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
