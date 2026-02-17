import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', role: 'role' },
  tasks: { freelancerId: 'freelancerId' },
  taskFiles: { uploadedBy: 'uploadedBy' },
  taskMessages: { senderId: 'senderId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { DELETE } = await import('./route')

function makeRequest(options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/clients/user-1',
    method: 'DELETE',
    json: vi.fn(),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function chainableUpdate() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function chainableDelete() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  }
}

describe('DELETE /api/admin/clients/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'user-1' })

    const response = await DELETE(request as never, { params })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return 404 when user not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([]))

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'nonexistent' })

    const response = await DELETE(request as never, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('should return 400 when trying to delete admin user', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([{ id: 'admin-2', role: 'ADMIN' }]))

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'admin-2' })

    const response = await DELETE(request as never, { params })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Cannot delete admin')
  })

  it('should delete client user and related data', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([{ id: 'client-1', role: 'CLIENT' }]))
    mockUpdate.mockReturnValue(chainableUpdate())
    mockDelete.mockReturnValue(chainableDelete())

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'client-1' })

    const response = await DELETE(request as never, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    // Should delete taskFiles, taskMessages, and user
    expect(mockDelete).toHaveBeenCalledTimes(3)
  })

  it('should unassign freelancer from tasks before deletion', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([{ id: 'freelancer-1', role: 'FREELANCER' }]))
    mockUpdate.mockReturnValue(chainableUpdate())
    mockDelete.mockReturnValue(chainableDelete())

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'freelancer-1' })

    const response = await DELETE(request as never, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    // Should update tasks to unassign, then delete files, messages, user
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockDelete).toHaveBeenCalledTimes(3)
  })

  it('should not update tasks for non-freelancer users', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([{ id: 'client-1', role: 'CLIENT' }]))
    mockDelete.mockReturnValue(chainableDelete())

    const request = makeRequest()
    const params = Promise.resolve({ userId: 'client-1' })

    await DELETE(request as never, { params })

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
