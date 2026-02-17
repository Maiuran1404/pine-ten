import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Hoisted mock references via wrapper pattern
const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user-1',
          company: { name: 'Test Co', industry: 'SaaS' },
        }),
      },
    },
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
  companies: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock Anthropic SDK — class constructor with streaming
const mockStream = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { stream: (...args: unknown[]) => mockStream(...args) }
    },
  }
})

const { POST } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/chat/stream', () => {
  const validBody = {
    messages: [{ role: 'user', content: 'I need a logo design' }],
  }

  function setupAuth(userId = 'user-1') {
    mockRequireAuth.mockResolvedValue({
      user: { id: userId, name: 'Test User', email: 'test@test.com' },
    })
  }

  function setupStream(texts: string[] = ['Hello', ' there']) {
    const events = texts.map((text) => ({
      type: 'content_block_delta',
      delta: { type: 'text_delta', text },
    }))

    mockStream.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        for (const event of events) {
          yield event
        }
      },
    })
  }

  function makeRequest(body: unknown) {
    return {
      url: 'http://localhost/api/chat/stream',
      method: 'POST',
      json: vi.fn().mockResolvedValue(body),
      headers: { get: () => null, has: () => false },
      cookies: { get: () => undefined },
      ip: '127.0.0.1',
    }
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 for empty messages', async () => {
    setupAuth()

    const response = await POST(makeRequest({ messages: [] }) as never)
    expect(response.status).toBe(400)
  })

  it('returns a streaming response with SSE format', async () => {
    setupAuth()
    setupStream(['Hello', ' world'])

    const response = await POST(makeRequest(validBody) as never)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')

    // Read the stream
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value)
    }

    expect(fullText).toContain('data: ')
    expect(fullText).toContain('"text"')
    expect(fullText).toContain('"done":true')
  })

  it('passes messages to anthropic stream correctly', async () => {
    setupAuth()
    setupStream(['OK'])

    const body = {
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ],
    }

    const response = await POST(makeRequest(body) as never)
    expect(response.status).toBe(200)

    expect(mockStream).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ],
      })
    )
  })
})
