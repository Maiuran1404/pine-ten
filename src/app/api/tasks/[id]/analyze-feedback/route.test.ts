import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations', () => ({
  analyzeFeedbackSchema: {
    parse: vi.fn((body: unknown) => body as Record<string, unknown>),
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockDbSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  tasks: { id: 'id', clientId: 'clientId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const mockAnthropicCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: (...args: unknown[]) => mockAnthropicCreate(...args) }
    },
  }
})

const { POST } = await import('./route')

function chainableSelect(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/tasks/task-1/analyze-feedback',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    cookies: { get: () => undefined },
    ip: '127.0.0.1',
  }
}

const defaultBody = {
  feedback: 'Change the color to blue',
  originalRequirements: { style: 'modern' },
  description: 'Logo design',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/tasks/[id]/analyze-feedback', () => {
  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test', email: 'test@test.com' },
    })
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 404 when task not found', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(chainableSelect([]))

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toContain('Task')
  })

  it('returns 403 when user is not the task owner', async () => {
    setupAuth('other-user')
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'task-1', clientId: 'user-1', revisionsUsed: 0, maxRevisions: 3 }])
    )

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    expect(response.status).toBe(403)
  })

  it('returns non-revision when max revisions reached', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'task-1', clientId: 'user-1', revisionsUsed: 3, maxRevisions: 3 }])
    )

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isRevision).toBe(false)
    expect(data.data.estimatedCredits).toBe(1)
  })

  it('analyzes feedback with AI and returns revision result', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'task-1', clientId: 'user-1', revisionsUsed: 1, maxRevisions: 3 }])
    )
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"isRevision": true, "reason": "Minor color change request"}',
        },
      ],
    })

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isRevision).toBe(true)
    expect(data.data.reason).toBe('Minor color change request')
  })

  it('falls back to revision on AI error', async () => {
    setupAuth()
    mockDbSelect.mockReturnValueOnce(
      chainableSelect([{ id: 'task-1', clientId: 'user-1', revisionsUsed: 0, maxRevisions: 3 }])
    )
    mockAnthropicCreate.mockRejectedValue(new Error('AI API down'))

    const response = await POST(makeRequest(defaultBody) as never, {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isRevision).toBe(true)
    expect(data.data.reason).toContain('Unable to analyze')
  })
})
