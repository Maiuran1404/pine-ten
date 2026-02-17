import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const mockInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  brandReferences: {},
}))

const mockClassifyBrandImage = vi.fn()
vi.mock('@/lib/ai/classify-brand-image', () => ({
  classifyBrandImage: (...args: unknown[]) => mockClassifyBrandImage(...args),
}))

const mockUploadToStorage = vi.fn()
vi.mock('@/lib/storage', () => ({
  uploadToStorage: (...args: unknown[]) => mockUploadToStorage(...args),
}))

const mockOptimizeImage = vi.fn()
vi.mock('@/lib/image/optimize', () => ({
  optimizeImage: (...args: unknown[]) => mockOptimizeImage(...args),
}))

function makeFormDataRequest(files: Array<{ name: string; type: string; content: string }>) {
  const formData = new Map<string, unknown[]>()

  const fileObjects = files.map((f) => ({
    name: f.name,
    type: f.type,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  }))

  formData.set('files', fileObjects)

  return {
    url: 'http://localhost/api/admin/brand-references/upload',
    method: 'POST',
    formData: vi.fn().mockResolvedValue({
      getAll: (key: string) => formData.get(key) || [],
      get: (key: string) => (formData.get(key) || [])[0] || null,
    }),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

function makeEmptyFormDataRequest() {
  return {
    url: 'http://localhost/api/admin/brand-references/upload',
    method: 'POST',
    formData: vi.fn().mockResolvedValue({
      getAll: () => [],
      get: () => null,
    }),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { POST, PUT } = await import('./route')

describe('POST /api/admin/brand-references/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeFormDataRequest([{ name: 'test.jpg', type: 'image/jpeg', content: 'data' }])
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when no files provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeEmptyFormDataRequest()
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should upload and classify images', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockVariants = {
      full: { buffer: Buffer.from('full'), size: 100 },
      preview: { buffer: Buffer.from('preview'), size: 50 },
      thumbnail: { buffer: Buffer.from('thumb'), size: 25 },
    }
    mockOptimizeImage.mockResolvedValue(mockVariants)

    mockClassifyBrandImage.mockResolvedValue({
      name: 'Modern Brand',
      description: 'A modern brand reference',
      toneBucket: 'warm',
      energyBucket: 'high',
      densityBucket: 'medium',
      colorBucket: 'vibrant',
      colorSamples: ['#FF0000', '#00FF00'],
      confidence: 0.95,
    })

    mockUploadToStorage.mockResolvedValue('https://storage.example.com/test.webp')

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'ref-1',
            name: 'Modern Brand',
            imageUrl: 'https://storage.example.com/test.webp',
          },
        ]),
      }),
    })

    const request = makeFormDataRequest([
      { name: 'brand.jpg', type: 'image/jpeg', content: 'data' },
    ])
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.processed).toBe(1)
    expect(data.data.successful).toBe(1)
    expect(data.data.failed).toBe(0)
  })

  it('should skip non-image files', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeFormDataRequest([
      { name: 'doc.pdf', type: 'application/pdf', content: 'data' },
    ])
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].error).toContain('Invalid file type')
  })

  it('should handle classification errors gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockVariants = {
      full: { buffer: Buffer.from('full'), size: 100 },
      preview: { buffer: Buffer.from('preview'), size: 50 },
      thumbnail: { buffer: Buffer.from('thumb'), size: 25 },
    }
    mockOptimizeImage.mockResolvedValue(mockVariants)
    mockClassifyBrandImage.mockRejectedValue(new Error('AI service unavailable'))

    const request = makeFormDataRequest([
      { name: 'brand.jpg', type: 'image/jpeg', content: 'data' },
    ])
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].error).toContain('AI service unavailable')
  })
})

describe('PUT /api/admin/brand-references/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeFormDataRequest([{ name: 'test.jpg', type: 'image/jpeg', content: 'data' }])
    const response = await PUT(request)

    expect(response.status).toBe(401)
  })
})
