import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: { app: { url: 'https://crafted.test' } },
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}))

// Mock validations
vi.mock('@/lib/validations', () => ({
  taskMessageSchema: {
    parse: vi.fn((body: unknown) => body as { content: string; attachments: unknown[] }),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'id', clientId: 'clientId', freelancerId: 'freelancerId' },
  taskMessages: { id: 'id', taskId: 'taskId', senderId: 'senderId' },
  users: { id: 'id', name: 'name', image: 'image' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
}))

const { GET, POST } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

// For GET messages: .from().leftJoin().where().orderBy()
function chainableSelectWithJoinOrderBy(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

// For final message lookup: .from().leftJoin().where().limit()
function chainableSelectWithJoinLimit(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/tasks/[id]/messages', () => {
  const taskId = 'task-123'
  const params = Promise.resolve({ id: taskId })

  function setupAuth(userId = 'client-1', role = 'CLIENT') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com', role },
    })
  }

  const mockRequest = {
    url: `http://localhost/api/tasks/${taskId}/messages`,
    method: 'GET',
  }

  it('returns 404 when task not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await GET(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 403 when user has no permission', async () => {
    setupAuth('random-user')
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: taskId, clientId: 'client-1', freelancerId: 'freelancer-1' }])
    )

    const response = await GET(mockRequest as never, { params })
    expect(response.status).toBe(403)
  })

  it('returns messages for task owner', async () => {
    setupAuth()
    // Task lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: taskId, clientId: 'client-1', freelancerId: 'freelancer-1' }])
    )
    // Messages lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithJoinOrderBy([
        {
          id: 'msg-1',
          content: 'Hello',
          attachments: [],
          createdAt: new Date(),
          senderId: 'client-1',
          senderName: 'Test Client',
          senderImage: null,
        },
      ])
    )

    const response = await GET(mockRequest as never, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.messages).toHaveLength(1)
  })
})

describe('POST /api/tasks/[id]/messages', () => {
  const taskId = 'task-123'
  const params = Promise.resolve({ id: taskId })

  function setupAuth(userId = 'client-1', role = 'CLIENT') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com', role },
    })
  }

  function makeRequest(body: unknown) {
    return {
      url: `http://localhost/api/tasks/${taskId}/messages`,
      method: 'POST',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 404 when task not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest({ content: 'Hello', attachments: [] }) as never, {
      params,
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 403 when user has no permission', async () => {
    setupAuth('random-user')
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: taskId, clientId: 'client-1', freelancerId: 'freelancer-1' }])
    )

    const response = await POST(makeRequest({ content: 'Hello', attachments: [] }) as never, {
      params,
    })
    expect(response.status).toBe(403)
  })

  it('successfully sends a message and returns 200', async () => {
    setupAuth()
    // Task lookup
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([
        {
          id: taskId,
          title: 'Test Task',
          clientId: 'client-1',
          freelancerId: 'freelancer-1',
        },
      ])
    )
    // Insert message
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([
            { id: 'msg-new', taskId, senderId: 'client-1', content: 'Hello', attachments: [] },
          ]),
      }),
    })
    // Get message with sender (the final select+leftJoin)
    mockDbSelect.mockReturnValueOnce(
      chainableSelectWithJoinLimit([
        {
          id: 'msg-new',
          content: 'Hello',
          attachments: [],
          createdAt: new Date(),
          senderId: 'client-1',
          senderName: 'Test Client',
          senderImage: null,
        },
      ])
    )

    const response = await POST(makeRequest({ content: 'Hello', attachments: [] }) as never, {
      params,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.success).toBe(true)
  })
})
