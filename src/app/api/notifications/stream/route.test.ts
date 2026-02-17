import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: {
    id: 'id',
    title: 'title',
    status: 'status',
    clientId: 'clientId',
    freelancerId: 'freelancerId',
    updatedAt: 'updatedAt',
  },
  taskMessages: { taskId: 'taskId', createdAt: 'createdAt', content: 'content' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
  desc: vi.fn(),
}))

const { GET } = await import('./route')

describe('GET /api/notifications/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw when user is not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))

    const request = new Request('http://localhost/api/notifications/stream')

    await expect(GET(request as never)).rejects.toThrow('Unauthorized')
  })

  it('should return SSE response with correct headers', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'CLIENT' },
    })

    const request = new Request('http://localhost/api/notifications/stream')
    const response = await GET(request as never)

    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(response.headers.get('Connection')).toBe('keep-alive')
    expect(response.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('should return a ReadableStream body', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'CLIENT' },
    })

    const request = new Request('http://localhost/api/notifications/stream')
    const response = await GET(request as never)

    expect(response.body).toBeInstanceOf(ReadableStream)
  })

  it('should send initial connected message', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'CLIENT' },
    })

    const request = new Request('http://localhost/api/notifications/stream')
    const response = await GET(request as never)

    const reader = response.body!.getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)

    expect(text).toContain('data: ')
    expect(text).toContain('"type":"connected"')
    expect(text).toContain('"timestamp"')

    reader.cancel()
  })

  it('should return 200 status', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', role: 'FREELANCER' },
    })

    const request = new Request('http://localhost/api/notifications/stream')
    const response = await GET(request as never)

    expect(response.status).toBe(200)

    // Cancel the stream to clean up
    if (response.body) {
      const reader = response.body.getReader()
      reader.cancel()
    }
  })
})
