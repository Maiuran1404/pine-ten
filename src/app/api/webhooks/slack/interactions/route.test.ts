import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifySlackSignature = vi.fn()
vi.mock('@/lib/slack', () => ({
  verifySlackSignature: (...args: unknown[]) => mockVerifySlackSignature(...args),
  updateMessage: vi.fn(),
  openModal: vi.fn(),
  notifySlack: vi.fn(),
}))

vi.mock('@/lib/slack/blocks', () => ({
  freelancerApprovedBlock: vi.fn(),
  taskVerifiedBlock: vi.fn(),
  rejectFreelancerModal: vi.fn(),
  requestTaskChangesModal: vi.fn(),
}))

vi.mock('@/lib/slack/types', () => ({}))

vi.mock('@/db', () => ({
  db: {
    query: {
      freelancerProfiles: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      tasks: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}))

vi.mock('@/db/schema', () => ({
  users: {},
  freelancerProfiles: {},
  tasks: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const { POST } = await import('./route')

function makeInteractionRequest(
  payload: unknown,
  options: { signature?: string; timestamp?: string; validSig?: boolean } = {}
) {
  const payloadStr = `payload=${encodeURIComponent(JSON.stringify(payload))}`
  return new Request('http://localhost/api/webhooks/slack/interactions', {
    method: 'POST',
    body: payloadStr,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-slack-signature': options.signature || 'v0=abc123',
      'x-slack-request-timestamp': options.timestamp || '1234567890',
    },
  })
}

describe('POST /api/webhooks/slack/interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for invalid signature', async () => {
    mockVerifySlackSignature.mockReturnValue(false)

    const request = makeInteractionRequest({
      type: 'block_actions',
      user: { name: 'testuser' },
      actions: [{ action_id: 'test', value: 'val' }],
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid signature')
  })

  it('should return 400 for missing payload', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const request = new Request('http://localhost/api/webhooks/slack/interactions', {
      method: 'POST',
      body: 'no_payload=here',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-slack-signature': 'v0=abc',
        'x-slack-request-timestamp': '123',
      },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing payload')
  })

  it('should return ok for valid block_actions interaction', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const request = makeInteractionRequest({
      type: 'block_actions',
      user: { name: 'admin', username: 'admin' },
      actions: [{ action_id: 'link_view', value: 'some-url' }],
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('should return ok for unknown interaction type', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const request = makeInteractionRequest({
      type: 'unknown_type',
      user: { name: 'admin', username: 'admin' },
    })

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('should verify signature with correct params', async () => {
    mockVerifySlackSignature.mockReturnValue(true)

    const request = makeInteractionRequest(
      { type: 'block_actions', user: { name: 'admin', username: 'admin' }, actions: [] },
      { signature: 'v0=mysig', timestamp: '111222' }
    )

    await POST(request as never)

    expect(mockVerifySlackSignature).toHaveBeenCalledWith('v0=mysig', '111222', expect.any(String))
  })
})
