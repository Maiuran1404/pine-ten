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
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  orshotTemplates: { id: 'id', name: 'name', isActive: 'isActive' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, PATCH } = await import('./route')

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/orshot-templates/tpl-1',
    method: 'PATCH',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

const mockTemplate = {
  id: 'tpl-1',
  name: 'Social Post',
  description: 'A social media template',
  category: 'social_media',
  orshotTemplateId: 42,
  previewImageUrl: 'https://example.com/preview.jpg',
  parameterMapping: {},
  outputFormat: 'png',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/admin/orshot-templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await GET(makeRequest() as never, makeParams('tpl-1'))
    expect(response.status).toBe(401)
  })

  it('returns 404 when template not found', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await GET(makeRequest() as never, makeParams('nonexistent'))
    expect(response.status).toBe(404)
  })

  it('returns template successfully', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      }),
    })

    const response = await GET(makeRequest() as never, makeParams('tpl-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.template.id).toBe('tpl-1')
    expect(data.data.template.name).toBe('Social Post')
  })
})

describe('PATCH /api/admin/orshot-templates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    })
  })

  it('returns 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(
      new APIError(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401)
    )

    const response = await PATCH(makeRequest({ name: 'Updated' }) as never, makeParams('tpl-1'))
    expect(response.status).toBe(401)
  })

  it('returns 404 when template not found', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await PATCH(
      makeRequest({ name: 'Updated' }) as never,
      makeParams('nonexistent')
    )
    expect(response.status).toBe(404)
  })

  it('updates template name successfully', async () => {
    const updatedTemplate = { ...mockTemplate, name: 'Updated Name' }

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      }),
    })

    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedTemplate]),
        }),
      }),
    })

    const response = await PATCH(
      makeRequest({ name: 'Updated Name' }) as never,
      makeParams('tpl-1')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.template.name).toBe('Updated Name')
  })

  it('rejects invalid category', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      }),
    })

    const response = await PATCH(
      makeRequest({ category: 'invalid_category' }) as never,
      makeParams('tpl-1')
    )
    expect(response.status).toBe(400)
  })

  it('rejects invalid output format', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockTemplate]),
        }),
      }),
    })

    const response = await PATCH(makeRequest({ outputFormat: 'bmp' }) as never, makeParams('tpl-1'))
    expect(response.status).toBe(400)
  })
})
