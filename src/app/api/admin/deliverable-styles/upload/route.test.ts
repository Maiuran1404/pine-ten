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
  deliverableStyleReferences: {},
}))

const mockClassifyDeliverableStyle = vi.fn()
vi.mock('@/lib/ai/classify-deliverable-style', () => ({
  classifyDeliverableStyle: (...args: unknown[]) => mockClassifyDeliverableStyle(...args),
}))

const mockUploadToStorage = vi.fn()
vi.mock('@/lib/storage', () => ({
  uploadToStorage: (...args: unknown[]) => mockUploadToStorage(...args),
}))

function makeFormDataRequest(files: Array<{ name: string; type: string }>) {
  const fileObjects = files.map((f) => ({
    name: f.name,
    type: f.type,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  }))

  return {
    url: 'http://localhost/api/admin/deliverable-styles/upload',
    method: 'POST',
    formData: vi.fn().mockResolvedValue({
      getAll: (key: string) => (key === 'files' ? fileObjects : []),
      get: (key: string) => (key === 'file' ? fileObjects[0] || null : null),
    }),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

function makeEmptyFormDataRequest() {
  return {
    url: 'http://localhost/api/admin/deliverable-styles/upload',
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

describe('POST /api/admin/deliverable-styles/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeFormDataRequest([{ name: 'style.jpg', type: 'image/jpeg' }])
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when no files provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeEmptyFormDataRequest()
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should upload and classify deliverable style images', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockClassifyDeliverableStyle.mockResolvedValue({
      name: 'Minimalist Logo',
      description: 'A minimalist logo design',
      deliverableType: 'logo',
      styleAxis: 'minimalist',
      subStyle: null,
      semanticTags: ['clean', 'simple'],
      confidence: 0.92,
      colorTemperature: 'neutral',
      energyLevel: 'low',
      densityLevel: 'sparse',
      formalityLevel: 'formal',
      colorSamples: ['#000000', '#FFFFFF'],
      industries: ['tech'],
      targetAudience: 'professionals',
      visualElements: ['geometric shapes'],
      moodKeywords: ['elegant', 'modern'],
    })

    mockUploadToStorage.mockResolvedValue('https://storage.example.com/style.jpg')

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'style-1',
            name: 'Minimalist Logo',
            imageUrl: 'https://storage.example.com/style.jpg',
          },
        ]),
      }),
    })

    const request = makeFormDataRequest([{ name: 'style.jpg', type: 'image/jpeg' }])
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.processed).toBe(1)
    expect(data.data.successful).toBe(1)
  })

  it('should reject non-image files', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeFormDataRequest([{ name: 'doc.pdf', type: 'application/pdf' }])
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].error).toContain('Invalid file type')
  })
})

describe('PUT /api/admin/deliverable-styles/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeFormDataRequest([{ name: 'style.jpg', type: 'image/jpeg' }])
    const response = await PUT(request)

    expect(response.status).toBe(401)
  })
})
