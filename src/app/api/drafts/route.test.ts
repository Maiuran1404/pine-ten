import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  saveDraftSchema: {
    parse: vi.fn((body: unknown) => body as Record<string, unknown>),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockQueryChatDrafts = { findMany: vi.fn(), findFirst: vi.fn() }
const mockDbUpdate = vi.fn()
const mockDbInsert = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    query: { chatDrafts: mockQueryChatDrafts },
    update: (...args: unknown[]) => mockDbUpdate(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  chatDrafts: { id: 'id', clientId: 'clientId', updatedAt: 'updatedAt' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeRequest(body: unknown, url = 'http://localhost/api/drafts') {
  return {
    url,
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/drafts', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns user drafts', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
    mockQueryChatDrafts.findMany.mockResolvedValue([
      { id: 'draft-1', title: 'My Draft', messages: [], clientId: 'user-1' },
    ])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.drafts).toHaveLength(1)
    expect(data.data.drafts[0].title).toBe('My Draft')
  })
})

describe('POST /api/drafts', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('creates a new draft when no valid UUID provided', async () => {
    setupAuth()
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'new-uuid', title: 'New Request' }]),
      }),
    })

    const response = await POST(
      makeRequest({ id: 'draft_local_123', title: 'New Request', messages: [] }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.draft.id).toBe('new-uuid')
    expect(data.data.localId).toBe('draft_local_123')
  })

  it('updates an existing draft with valid UUID', async () => {
    setupAuth()
    const uuid = '12345678-1234-1234-1234-123456789abc'
    mockQueryChatDrafts.findFirst.mockResolvedValue({
      id: uuid,
      title: 'Old Title',
      messages: [],
      selectedStyles: [],
    })
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: uuid, title: 'Updated Title' }]),
        }),
      }),
    })

    const response = await POST(
      makeRequest({
        id: uuid,
        title: 'Updated Title',
        messages: [{ role: 'user', content: 'hi' }],
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.draft.title).toBe('Updated Title')
  })
})

describe('DELETE /api/drafts', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 400 when no draft ID provided', async () => {
    setupAuth()

    const response = await DELETE(makeRequest(null, 'http://localhost/api/drafts') as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Draft ID')
  })

  it('deletes a draft with valid UUID', async () => {
    setupAuth()
    const uuid = '12345678-1234-1234-1234-123456789abc'
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const response = await DELETE(
      makeRequest(null, `http://localhost/api/drafts?id=${uuid}`) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockDbDelete).toHaveBeenCalled()
  })

  it('returns success for local draft ID without DB call', async () => {
    setupAuth()

    const response = await DELETE(
      makeRequest(null, 'http://localhost/api/drafts?id=draft_local_123') as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(mockDbDelete).not.toHaveBeenCalled()
  })
})
