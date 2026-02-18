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
  deliverableStyleReferences: {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'imageUrl',
    videoUrl: 'videoUrl',
    videoThumbnailUrl: 'videoThumbnailUrl',
    videoTags: 'videoTags',
    videoDuration: 'videoDuration',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    featuredOrder: 'featuredOrder',
    displayOrder: 'displayOrder',
    isActive: 'isActive',
    semanticTags: 'semanticTags',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNotNull: vi.fn(),
}))

const { GET, POST, PATCH: _PATCH, DELETE } = await import('./route')

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/video-references',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

describe('GET /api/admin/video-references', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/video-references' })
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return list of video references', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockVideos = [
      { id: 'v-1', videoUrl: 'https://youtube.com/watch?v=abc', videoTags: ['intro', 'bold'] },
    ]
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockVideos),
        }),
      }),
    })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/video-references' })
    const response = await GET(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.videos).toHaveLength(1)
    expect(data.data.tags).toContain('intro')
    expect(data.data.tags).toContain('bold')
  })
})

describe('POST /api/admin/video-references', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when videoUrl is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ name: 'Test' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Video URL is required')
  })

  it('should return 400 for invalid YouTube URL', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ videoUrl: 'https://notYoutube.com/video' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Invalid YouTube URL')
  })

  it('should create video reference with valid YouTube URL', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    // Check existing - none found
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const newVideo = {
      id: 'v-new',
      name: 'Test Video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newVideo]),
      }),
    })

    const request = makeRequest({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.video.id).toBe('v-new')
  })

  it('should return 400 for duplicate video', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'existing-id' }]),
        }),
      }),
    })

    const request = makeRequest({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('already been added')
  })
})

describe('DELETE /api/admin/video-references', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/video-references' })
    const response = await DELETE(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Video ID is required')
  })
})
