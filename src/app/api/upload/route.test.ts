import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    app: { url: 'https://crafted.test' },
    rateLimits: { api: 100 },
    uploads: { maxFileSizeMB: 50 },
  },
}))

// Mock rate limit
const mockCheckRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// Mock require-auth
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

// Mock Supabase storage
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  getAdminStorageClient: () => ({
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  }),
}))

const { POST } = await import('./route')

function setupAuth(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'CLIENT',
    ...overrides,
  }
  mockRequireAuth.mockResolvedValue({ user })
  return user
}

function makeUploadRequest(
  options: {
    contentType?: string
    file?: { name: string; type: string; size: number; content?: number[] } | null
    folder?: string
  } = {}
) {
  const {
    contentType = 'multipart/form-data; boundary=----formdata',
    file = { name: 'test.png', type: 'image/png', size: 1024, content: [0x89, 0x50, 0x4e, 0x47] },
    folder = 'attachments',
  } = options

  const fileObj = file
    ? {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: vi
          .fn()
          .mockResolvedValue(
            new Uint8Array(file.content || [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer
          ),
      }
    : null

  const formData = new Map<string, unknown>()
  if (fileObj) formData.set('file', fileObj)
  formData.set('folder', folder)

  return {
    url: 'http://localhost/api/upload',
    method: 'POST',
    headers: {
      get: (key: string) => (key === 'content-type' ? contentType : null),
      has: () => false,
    },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
    formData: vi.fn().mockResolvedValue({
      get: (key: string) => formData.get(key) ?? null,
    }),
  }
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockReturnValue({ limited: false, resetIn: 0 })
  })

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ limited: true, resetIn: 30 })

    const response = await POST(makeUploadRequest() as never)
    expect(response.status).toBe(429)
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireAuth.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(makeUploadRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 for non-multipart content type', async () => {
    setupAuth()

    const response = await POST(makeUploadRequest({ contentType: 'application/json' }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('multipart/form-data')
  })

  it('returns 400 for disallowed MIME type', async () => {
    setupAuth()

    const response = await POST(
      makeUploadRequest({
        file: { name: 'evil.exe', type: 'application/x-msdownload', size: 1024 },
      }) as never
    )
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('File type not allowed')
  })

  it('returns 400 when file is too large', async () => {
    setupAuth()

    const maxSize = 50 * 1024 * 1024 // 50MB from config
    const response = await POST(
      makeUploadRequest({
        file: {
          name: 'huge.png',
          type: 'image/png',
          size: maxSize + 1,
          content: [0x89, 0x50, 0x4e, 0x47],
        },
      }) as never
    )
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('File too large')
  })

  it('returns 400 when no file is provided', async () => {
    setupAuth()

    const response = await POST(makeUploadRequest({ file: null }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('No file provided')
  })

  it('returns 400 for mismatched extension and MIME type', async () => {
    setupAuth()

    const response = await POST(
      makeUploadRequest({
        file: {
          name: 'image.jpg',
          type: 'image/png',
          size: 1024,
          content: [0x89, 0x50, 0x4e, 0x47],
        },
      }) as never
    )
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('extension does not match')
  })

  it('successfully uploads a file and returns URL', async () => {
    setupAuth()

    mockUpload.mockResolvedValue({
      data: { path: 'attachments/user-1/12345-abc-test.png' },
      error: null,
    })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.supabase.co/uploads/attachments/user-1/12345-abc-test.png' },
    })

    const response = await POST(makeUploadRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.file).toBeDefined()
    expect(data.data.file.fileUrl).toContain('cdn.supabase.co')
    expect(data.data.file.fileName).toBe('test.png')
    expect(data.data.file.fileType).toBe('image/png')
  })

  it('returns 500 when Supabase upload fails', async () => {
    setupAuth()

    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    })

    const response = await POST(makeUploadRequest() as never)
    expect(response.status).toBe(500)
  })
})
