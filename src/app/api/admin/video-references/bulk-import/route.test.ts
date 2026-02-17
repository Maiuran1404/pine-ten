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
const mockInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  deliverableStyleReferences: {
    id: 'id',
    videoUrl: 'videoUrl',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/video-references/bulk-import',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

describe('POST /api/admin/video-references/bulk-import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({ videos: [{ url: 'https://youtube.com/watch?v=abc12345678' }] })
    const response = await POST(request as never)

    expect(response.status).toBe(401)
  })

  it('should return 400 when videos array is empty', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ videos: [] })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Videos array is required')
  })

  it('should return 400 when videos is not provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({})
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Videos array is required')
  })

  it('should import valid videos and skip duplicates', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    // First video check - not existing
    mockSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      })
      // Second video check - already exists
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
          }),
        }),
      })

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-id', name: 'Launch Video abc123' }]),
      }),
    })

    const request = makeRequest({
      videos: [
        { url: 'https://www.youtube.com/watch?v=abc12345678' },
        { url: 'https://www.youtube.com/watch?v=def12345678' },
      ],
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary.total).toBe(2)
    expect(data.data.summary.imported).toBe(1)
    expect(data.data.summary.skipped).toBe(1)
  })

  it('should handle invalid YouTube URLs in bulk', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({
      videos: [{ url: 'https://not-youtube.com/video' }],
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary.failed).toBe(1)
    expect(data.data.results.failed[0].error).toContain('Invalid YouTube URL')
  })
})
