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

// Mock global fetch
vi.stubGlobal('fetch', vi.fn())

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/brand-references/import-urls',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { POST, PUT, PATCH } = await import('./route')

describe('POST /api/admin/brand-references/import-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({ urls: ['https://example.com/image.jpg'] })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when no URLs or images provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should import images from base64 data', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const mockVariants = {
      full: { buffer: Buffer.from('full'), size: 100 },
      preview: { buffer: Buffer.from('preview'), size: 50 },
      thumbnail: { buffer: Buffer.from('thumb'), size: 25 },
    }
    mockOptimizeImage.mockResolvedValue(mockVariants)

    mockClassifyBrandImage.mockResolvedValue({
      name: 'Brand Style',
      description: 'A brand reference',
      toneBucket: 'cool',
      energyBucket: 'low',
      densityBucket: 'sparse',
      colorBucket: 'muted',
      colorSamples: ['#333333'],
      confidence: 0.9,
    })

    mockUploadToStorage.mockResolvedValue('https://storage.example.com/imported.webp')

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'ref-1',
            name: 'Brand Style',
            imageUrl: 'https://storage.example.com/imported.webp',
          },
        ]),
      }),
    })

    const request = makeRequest({
      images: [
        {
          url: 'https://example.com/image.jpg',
          base64: Buffer.from('test-image').toString('base64'),
          mediaType: 'image/jpeg',
        },
      ],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.successful).toBe(1)
  })

  it('should reject images missing base64 or mediaType', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({
      images: [
        {
          url: 'https://example.com/image.jpg',
          // missing base64 and mediaType
        },
      ],
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].error).toContain('Missing base64 or mediaType')
  })
})

describe('PUT /api/admin/brand-references/import-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when no URLs provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/admin/brand-references/import-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when no images provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await PATCH(request)

    expect(response.status).toBe(400)
  })
})
