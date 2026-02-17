import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    credits: { pricePerCredit: 4.9 },
    app: { url: 'https://crafted.test' },
  },
}))

// Hoisted mock references via wrapper pattern
const mockHandleWebhook = vi.fn()
const mockMarkEventProcessed = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/stripe', () => ({
  handleWebhook: (...args: unknown[]) => mockHandleWebhook(...args),
  markEventProcessed: (...args: unknown[]) => mockMarkEventProcessed(...args),
}))

vi.mock('@/lib/notifications', () => ({
  adminNotifications: { creditPurchase: vi.fn().mockResolvedValue(undefined) },
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailTemplates: {
    creditsPurchased: vi.fn().mockReturnValue({
      subject: 'Credits Purchased',
      html: '<p>Credits purchased</p>',
    }),
  },
}))

const mockDbSelect = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbInsert = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id', credits: 'credits' },
  creditTransactions: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

const { POST } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/webhooks/stripe', () => {
  function makeRequest(signature = 'whsec_test_signature') {
    return {
      url: 'http://localhost/api/webhooks/stripe',
      method: 'POST',
      text: vi.fn().mockResolvedValue('raw-webhook-body'),
      headers: {
        get: (name: string) => (name === 'stripe-signature' ? signature : null),
        has: (name: string) => name === 'stripe-signature' && !!signature,
      },
    }
  }

  it('returns 400 when stripe-signature header is missing', async () => {
    const request = makeRequest('')

    const response = await POST(request as never)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing signature')
  })

  it('returns 200 when webhook has no actionable result', async () => {
    mockHandleWebhook.mockResolvedValue(null)

    const response = await POST(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })

  it('adds credits to user on successful checkout', async () => {
    mockHandleWebhook.mockResolvedValue({
      userId: 'user-1',
      credits: 50,
      eventId: 'evt_123',
    })

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: 'user-1', name: 'Test User', email: 'user@test.com', credits: 10 },
            ]),
        }),
      }),
    })

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    })

    const response = await POST(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockMarkEventProcessed).toHaveBeenCalledWith(
      'evt_123',
      'checkout.session.completed',
      { userId: 'user-1', credits: 50 },
      'processed'
    )
  })

  it('marks event as failed when user not found', async () => {
    mockHandleWebhook.mockResolvedValue({
      userId: 'nonexistent-user',
      credits: 50,
      eventId: 'evt_456',
    })

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const response = await POST(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockMarkEventProcessed).toHaveBeenCalledWith(
      'evt_456',
      'checkout.session.completed',
      { userId: 'nonexistent-user', credits: 50 },
      'failed',
      'User not found'
    )
  })

  it('returns 500 when handleWebhook throws', async () => {
    mockHandleWebhook.mockRejectedValue(new Error('Signature verification failed'))

    const response = await POST(makeRequest() as never)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Webhook handler failed')
  })
})
