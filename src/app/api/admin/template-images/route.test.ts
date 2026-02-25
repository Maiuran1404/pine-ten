import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError, ErrorCodes } from '@/lib/errors'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock require-auth
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

// DB mocks
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
  templateImages: {
    id: 'id',
    categoryKey: 'categoryKey',
    optionKey: 'optionKey',
    imageUrl: 'imageUrl',
    sourceUrl: 'sourceUrl',
    isActive: 'isActive',
    displayOrder: 'displayOrder',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeGetRequest(url = 'http://localhost/api/admin/template-images') {
  return {
    url,
    method: 'GET',
    headers: { get: () => null, has: () => false },
  }
}

function makePostRequest(body: unknown) {
  return {
    url: 'http://localhost/api/admin/template-images',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function makeDeleteRequest(url = 'http://localhost/api/admin/template-images') {
  return {
    url,
    method: 'DELETE',
    headers: { get: () => null, has: () => false },
  }
}

function setupAdmin() {
  mockRequireAdmin.mockResolvedValue({
    user: { id: 'admin-1', name: 'Admin User', email: 'admin@test.com', role: 'ADMIN' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============ GET Tests ============

describe('GET /api/admin/template-images', () => {
  it('returns 401 when not authenticated as admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeGetRequest() as never)
    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions', 403)
    )

    const response = await GET(makeGetRequest() as never)
    expect(response.status).toBe(403)
  })

  it('returns all images without categoryKey filter', async () => {
    setupAdmin()

    const mockImages = [
      {
        id: 'img-1',
        categoryKey: 'launch-videos',
        optionKey: null,
        imageUrl: 'https://example.com/1.png',
      },
      {
        id: 'img-2',
        categoryKey: 'social-media',
        optionKey: 'post',
        imageUrl: 'https://example.com/2.png',
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockImages),
      }),
    })

    const response = await GET(makeGetRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.images).toHaveLength(2)
  })

  it('filters images by categoryKey when provided', async () => {
    setupAdmin()

    const mockImages = [
      {
        id: 'img-1',
        categoryKey: 'launch-videos',
        optionKey: null,
        imageUrl: 'https://example.com/1.png',
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(mockImages),
        }),
      }),
    })

    const url = 'http://localhost/api/admin/template-images?categoryKey=launch-videos'
    const response = await GET(makeGetRequest(url) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.images).toHaveLength(1)
  })
})

// ============ POST Tests ============

describe('POST /api/admin/template-images', () => {
  it('returns 401 when not authenticated as admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await POST(
      makePostRequest({
        categoryKey: 'launch-videos',
        imageUrl: 'https://example.com/image.png',
      }) as never
    )
    expect(response.status).toBe(401)
  })

  it('creates a new template image when no existing match', async () => {
    setupAdmin()

    const newImage = {
      id: 'new-img-1',
      categoryKey: 'launch-videos',
      optionKey: null,
      imageUrl: 'https://example.com/new.png',
      sourceUrl: null,
      displayOrder: 0,
    }

    // Existing check returns empty
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    // Insert returns new image
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newImage]),
      }),
    })

    const response = await POST(
      makePostRequest({
        categoryKey: 'launch-videos',
        imageUrl: 'https://example.com/new.png',
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.image.id).toBe('new-img-1')
  })

  it('upserts existing image when categoryKey+optionKey match', async () => {
    setupAdmin()

    const existingImage = {
      id: 'existing-img-1',
      categoryKey: 'launch-videos',
      optionKey: 'product-launch',
      imageUrl: 'https://example.com/old.png',
    }

    const updatedImage = {
      ...existingImage,
      imageUrl: 'https://example.com/updated.png',
    }

    // Existing check returns a match
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
    })

    // Update returns updated image
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedImage]),
        }),
      }),
    })

    const response = await POST(
      makePostRequest({
        categoryKey: 'launch-videos',
        optionKey: 'product-launch',
        imageUrl: 'https://example.com/updated.png',
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.image.imageUrl).toBe('https://example.com/updated.png')
  })

  it('handles null optionKey for category covers', async () => {
    setupAdmin()

    const newImage = {
      id: 'cover-img-1',
      categoryKey: 'launch-videos',
      optionKey: null,
      imageUrl: 'https://example.com/cover.png',
      sourceUrl: null,
      displayOrder: 0,
    }

    // Existing check returns empty (no match for null optionKey)
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    // Insert returns new image
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newImage]),
      }),
    })

    const response = await POST(
      makePostRequest({
        categoryKey: 'launch-videos',
        optionKey: null,
        imageUrl: 'https://example.com/cover.png',
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.image.optionKey).toBeNull()
  })

  it('returns 400 for invalid body (missing required fields)', async () => {
    setupAdmin()

    const response = await POST(
      makePostRequest({
        // Missing categoryKey and imageUrl
        optionKey: 'some-key',
      }) as never
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('returns 400 for invalid imageUrl', async () => {
    setupAdmin()

    const response = await POST(
      makePostRequest({
        categoryKey: 'launch-videos',
        imageUrl: 'not-a-valid-url',
      }) as never
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })
})

// ============ DELETE Tests ============

describe('DELETE /api/admin/template-images', () => {
  it('returns 401 when not authenticated as admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const url = 'http://localhost/api/admin/template-images?id=550e8400-e29b-41d4-a716-446655440000'
    const response = await DELETE(makeDeleteRequest(url) as never)
    expect(response.status).toBe(401)
  })

  it('deletes an image with a valid UUID', async () => {
    setupAdmin()

    mockDelete.mockReturnValueOnce({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const url = 'http://localhost/api/admin/template-images?id=550e8400-e29b-41d4-a716-446655440000'
    const response = await DELETE(makeDeleteRequest(url) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)
  })

  it('returns 400 for invalid UUID format', async () => {
    setupAdmin()

    const url = 'http://localhost/api/admin/template-images?id=not-a-uuid'
    const response = await DELETE(makeDeleteRequest(url) as never)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('returns 400 when id parameter is missing', async () => {
    setupAdmin()

    const url = 'http://localhost/api/admin/template-images'
    const response = await DELETE(makeDeleteRequest(url) as never)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })
})
