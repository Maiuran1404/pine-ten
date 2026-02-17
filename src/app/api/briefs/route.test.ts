import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/components/chat/brief-panel/types', () => ({
  calculateBriefCompletion: vi.fn().mockReturnValue(85),
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockQueryBriefs = { findFirst: vi.fn(), findMany: vi.fn() }
const mockQueryUsers = { findFirst: vi.fn() }
const mockQueryChatDrafts = { findFirst: vi.fn() }
const mockDbUpdate = vi.fn()
const mockDbInsert = vi.fn()
const mockDbDelete = vi.fn()
vi.mock('@/db', () => ({
  db: {
    query: {
      briefs: mockQueryBriefs,
      users: mockQueryUsers,
      chatDrafts: mockQueryChatDrafts,
    },
    update: (...args: unknown[]) => mockDbUpdate(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  briefs: { id: 'id', userId: 'userId', draftId: 'draftId' },
  users: { id: 'id' },
  chatDrafts: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}))

const { GET, POST, DELETE } = await import('./route')

function makeRequest(body: unknown, url = 'http://localhost/api/briefs') {
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

describe('GET /api/briefs', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await GET(makeRequest(null) as never)
    expect(response.status).toBe(401)
  })

  it('returns list of briefs', async () => {
    setupAuth()
    mockQueryBriefs.findMany.mockResolvedValue([
      {
        id: 'brief-1',
        draftId: 'draft-1',
        userId: 'user-1',
        status: 'READY',
        completionPercentage: 85,
        taskSummary: null,
        topic: null,
        platform: null,
        intent: null,
        taskType: null,
        audience: null,
        dimensions: [],
        visualDirection: null,
        contentOutline: null,
        clarifyingQuestionsAsked: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const response = await GET(makeRequest(null, 'http://localhost/api/briefs') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.briefs).toHaveLength(1)
  })

  it('returns specific brief by id', async () => {
    setupAuth()
    mockQueryBriefs.findFirst.mockResolvedValue({
      id: 'brief-1',
      draftId: 'draft-1',
      userId: 'user-1',
      status: 'READY',
      completionPercentage: 90,
      taskSummary: null,
      topic: null,
      platform: null,
      intent: null,
      taskType: null,
      audience: null,
      dimensions: [],
      visualDirection: null,
      contentOutline: null,
      clarifyingQuestionsAsked: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await GET(makeRequest(null, 'http://localhost/api/briefs?id=brief-1') as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.brief).toBeDefined()
  })

  it('returns null for non-UUID draftId', async () => {
    setupAuth()

    const response = await GET(
      makeRequest(null, 'http://localhost/api/briefs?draftId=draft_local_123') as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.brief).toBeNull()
  })
})

describe('POST /api/briefs', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 400 when brief data is missing', async () => {
    setupAuth()

    const response = await POST(makeRequest({}) as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('brief')
  })

  it('creates a new brief', async () => {
    setupAuth()
    mockQueryUsers.findFirst.mockResolvedValue({ id: 'user-1', companyId: 'company-1' })
    // draftId is not a valid UUID, so no draft lookup
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'brief-new',
            draftId: null,
            userId: 'user-1',
            status: 'READY',
            completionPercentage: 85,
            taskSummary: null,
            topic: null,
            platform: null,
            intent: null,
            taskType: null,
            audience: null,
            dimensions: [],
            visualDirection: null,
            contentOutline: null,
            clarifyingQuestionsAsked: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    })

    const response = await POST(
      makeRequest({
        brief: { taskSummary: { value: 'Logo design', confidence: 0.9, source: 'chat' } },
        draftId: 'draft_local_123',
      }) as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.id).toBe('brief-new')
  })
})

describe('DELETE /api/briefs', () => {
  function setupAuth() {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 400 when brief ID is missing', async () => {
    setupAuth()

    const response = await DELETE(makeRequest(null, 'http://localhost/api/briefs') as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('Brief ID')
  })

  it('deletes a brief', async () => {
    setupAuth()
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const response = await DELETE(
      makeRequest(null, 'http://localhost/api/briefs?id=brief-1') as never
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
