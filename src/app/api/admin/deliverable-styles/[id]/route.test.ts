import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
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
  deliverableStyleReferences: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { PATCH, DELETE } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/deliverable-styles/style-1',
    method: 'PATCH',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/deliverable-styles/[id]', () => {
  it('returns 401 when not admin', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await PATCH(makeRequest({ name: 'Updated' }) as never, {
      params: Promise.resolve({ id: 'style-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when style not found', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await PATCH(makeRequest({ name: 'Updated' }) as never, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Style')
  })

  it('updates a style', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: 'style-1', name: 'Updated Style', isActive: false }]),
        }),
      }),
    })

    const response = await PATCH(makeRequest({ name: 'Updated Style', isActive: false }) as never, {
      params: Promise.resolve({ id: 'style-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.style.name).toBe('Updated Style')
  })
})

describe('DELETE /api/admin/deliverable-styles/[id]', () => {
  it('deletes a style by ID', async () => {
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', name: 'Admin', email: 'admin@test.com' },
    })
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const response = await DELETE(makeRequest(null) as never, {
      params: Promise.resolve({ id: 'style-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
