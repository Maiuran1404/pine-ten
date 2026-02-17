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

vi.mock('@/lib/supabase/server', () => ({
  getAdminStorageClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://storage.example.com/test.jpg' } }),
      }),
      createBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/deliverable-styles/import-urls',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  } as never
}

const { POST, PUT } = await import('./route')

describe('POST /api/admin/deliverable-styles/import-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const request = makeRequest({ urls: ['https://example.com/style.jpg'] })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should return 400 when no URLs provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    const request = makeRequest({})
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should import images from URLs', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockFetch.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === 'content-type' ? 'image/jpeg' : null),
      },
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    })

    mockClassifyDeliverableStyle.mockResolvedValue({
      name: 'Bold Logo',
      description: 'A bold logo style',
      deliverableType: 'logo',
      styleAxis: 'bold',
      subStyle: 'geometric',
      semanticTags: ['modern', 'bold'],
      confidence: 0.88,
      colorTemperature: 'warm',
      energyLevel: 'high',
      densityLevel: 'dense',
      formalityLevel: 'casual',
      colorSamples: ['#FF5500'],
      industries: ['retail'],
      targetAudience: 'young adults',
      visualElements: ['bold typography'],
      moodKeywords: ['energetic'],
    })

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'style-1',
            name: 'Bold Logo',
            imageUrl: 'https://storage.example.com/test.jpg',
          },
        ]),
      }),
    })

    const request = makeRequest({ urls: ['https://example.com/logo.jpg'] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.successful).toBe(1)
  })

  it('should handle fetch failures gracefully', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    })

    const request = makeRequest({ urls: ['https://example.com/missing.jpg'] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.failed).toBe(1)
    expect(data.data.results[0].error).toContain('Failed to fetch')
  })
})

describe('PUT /api/admin/deliverable-styles/import-urls', () => {
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
