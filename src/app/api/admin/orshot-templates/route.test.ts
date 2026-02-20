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
const mockDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  orshotTemplates: {
    id: 'id',
    name: 'name',
    description: 'description',
    category: 'category',
    orshotTemplateId: 'orshotTemplateId',
    previewImageUrl: 'previewImageUrl',
    parameterMapping: 'parameterMapping',
    outputFormat: 'outputFormat',
    isActive: 'isActive',
    createdAt: 'createdAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeRequest(body?: unknown, options: { url?: string } = {}) {
  return {
    url: options.url || 'http://localhost/api/admin/orshot-templates',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

describe('GET /api/admin/orshot-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
  })

  it('should return list of templates', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const mockTemplates = [
      { id: 'tpl-1', name: 'Social Post', category: 'social_media', orshotTemplateId: 1 },
    ]
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockTemplates),
      }),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.templates).toEqual(mockTemplates)
  })
})

describe('POST /api/admin/orshot-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when required fields are missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ name: 'Test' })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('should return 400 for invalid category', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({
      name: 'Test',
      category: 'invalid_cat',
      orshotTemplateId: 1,
      parameterMapping: { key: 'value' },
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('should return 400 for non-numeric orshotTemplateId', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({
      name: 'Test',
      category: 'social_media',
      orshotTemplateId: 'abc',
      parameterMapping: {},
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toBe('Validation failed')
  })

  it('should create template with valid data', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const newTemplate = {
      id: 'tpl-new',
      name: 'Social Post',
      category: 'social_media',
      orshotTemplateId: 42,
      parameterMapping: { title: 'text' },
      outputFormat: 'png',
      isActive: true,
    }
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newTemplate]),
      }),
    })

    const request = makeRequest({
      name: 'Social Post',
      category: 'social_media',
      orshotTemplateId: 42,
      parameterMapping: { title: 'text' },
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.template.name).toBe('Social Post')
  })
})

describe('DELETE /api/admin/orshot-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when id is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest(undefined, { url: 'http://localhost/api/admin/orshot-templates' })
    const response = await DELETE(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Template ID is required')
  })

  it('should delete template by id', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest(undefined, {
      url: 'http://localhost/api/admin/orshot-templates?id=tpl-1',
    })
    const response = await DELETE(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
