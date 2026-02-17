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
const mockInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  platformSettings: {
    key: 'key',
    value: 'value',
    description: 'description',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { GET, POST } = await import('./route')

function makeRequest(body?: unknown) {
  return {
    url: 'http://localhost/api/admin/creative-intake-prompts',
    method: body ? 'POST' : 'GET',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('GET /api/admin/creative-intake-prompts', () => {
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

  it('should return null config when no custom config exists', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([]))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.config).toBeNull()
  })

  it('should return existing config when found', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    const mockConfig = { basePrompt: 'test', servicePrompts: {}, settings: {} }
    mockSelect.mockReturnValue(
      chainableSelect([{ key: 'creative_intake_prompts', value: mockConfig }])
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.config).toEqual(mockConfig)
  })
})

describe('POST /api/admin/creative-intake-prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const request = makeRequest({
      config: { basePrompt: 'test', servicePrompts: {}, settings: {} },
    })
    const response = await POST(request as never)

    expect(response.status).toBe(401)
  })

  it('should return 400 when config is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({})
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Config is required')
  })

  it('should return 400 when basePrompt is missing', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const request = makeRequest({ config: { servicePrompts: {}, settings: {} } })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('basePrompt')
  })

  it('should insert new config when none exists', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(chainableSelect([]))
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })

    const request = makeRequest({
      config: { basePrompt: 'test prompt', servicePrompts: { a: 'b' }, settings: { x: 1 } },
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
  })

  it('should update existing config', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    mockSelect.mockReturnValue(
      chainableSelect([{ key: 'creative_intake_prompts', value: { basePrompt: 'old' } }])
    )
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const request = makeRequest({
      config: { basePrompt: 'new prompt', servicePrompts: {}, settings: {} },
    })
    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })
})
