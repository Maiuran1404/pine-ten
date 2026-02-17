import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifySlackSignature = vi.fn()
vi.mock('@/lib/slack', () => ({
  verifySlackSignature: (...args: unknown[]) => mockVerifySlackSignature(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const { POST } = await import('./route')

function makeSlackRequest(body: unknown, headers: Record<string, string> = {}) {
  const bodyStr = JSON.stringify(body)
  return new Request('http://localhost/api/webhooks/slack/events', {
    method: 'POST',
    body: bodyStr,
    headers: {
      'Content-Type': 'application/json',
      'x-slack-signature': headers['x-slack-signature'] || 'v0=abc123',
      'x-slack-request-timestamp': headers['x-slack-request-timestamp'] || '1234567890',
    },
  })
}

describe('POST /api/webhooks/slack/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should echo challenge for url_verification', async () => {
    const request = makeSlackRequest({
      type: 'url_verification',
      challenge: 'test-challenge-token',
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.challenge).toBe('test-challenge-token')
  })

  it('should not require signature for url_verification', async () => {
    const request = makeSlackRequest({
      type: 'url_verification',
      challenge: 'my-challenge',
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(data.challenge).toBe('my-challenge')
    expect(mockVerifySlackSignature).not.toHaveBeenCalled()
  })

  it('should return 401 for invalid signature on event_callback', async () => {
    mockVerifySlackSignature.mockReturnValue(false)

    const request = makeSlackRequest({
      type: 'event_callback',
      event: { type: 'message', text: 'hello' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid signature')
  })

  it('should return ok for valid event_callback with valid signature', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const request = makeSlackRequest({
      type: 'event_callback',
      event: { type: 'message', text: 'hello', channel: 'C123' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('should verify signature with correct params', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const body = { type: 'event_callback', event: { type: 'message' } }
    const request = makeSlackRequest(body, {
      'x-slack-signature': 'v0=sig123',
      'x-slack-request-timestamp': '9999999',
    })

    await POST(request as never)

    expect(mockVerifySlackSignature).toHaveBeenCalledWith(
      'v0=sig123',
      '9999999',
      expect.any(String)
    )
  })

  it('should return 500 for malformed JSON', async () => {
    const request = new Request('http://localhost/api/webhooks/slack/events', {
      method: 'POST',
      body: 'not-json',
      headers: {
        'Content-Type': 'application/json',
        'x-slack-signature': 'v0=abc',
        'x-slack-request-timestamp': '123',
      },
    })

    const response = await POST(request as never)

    expect(response.status).toBe(500)
  })
})
