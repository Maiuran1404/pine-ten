import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only
vi.mock('server-only', () => ({}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// No auth mock needed — webhook route uses signature verification, not requireAuth

// DB mocks
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  websiteProjects: {
    id: 'id',
    deliveryStatus: 'deliveryStatus',
    framerDeployedUrl: 'framerDeployedUrl',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const { POST } = await import('./route')

const validProjectId = '00000000-0000-4000-8000-000000000001'

/**
 * Computes HMAC-SHA256 hex signature for webhook body verification.
 */
async function computeHmacSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function makeWebhookRequest(body: unknown, options: { signature?: string | null } = {}) {
  const bodyStr = JSON.stringify(body)
  return {
    url: 'http://localhost/api/website-flow/delivery/webhook',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    clone: vi.fn().mockReturnValue({
      text: vi.fn().mockResolvedValue(bodyStr),
    }),
    headers: {
      get: (name: string) => {
        if (name === 'x-framer-signature') {
          return options.signature === undefined ? null : options.signature
        }
        return null
      },
      has: () => false,
    },
  }
}

function setupDbSelect(project: Record<string, unknown> | null) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(project ? [project] : []),
      }),
    }),
  })
}

function setupDbUpdate() {
  const setMock = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })
  mockUpdate.mockReturnValue({
    set: setMock,
  })
  return setMock
}

describe('POST /api/website-flow/delivery/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FRAMER_WEBHOOK_SECRET
  })

  // ---- Schema Validation ----

  it('returns 400 when projectId is missing', async () => {
    const response = await POST(makeWebhookRequest({ event: 'build_completed' }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 when projectId is not a UUID', async () => {
    const response = await POST(
      makeWebhookRequest({ projectId: 'bad-id', event: 'build_completed' }) as never
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 when event is missing', async () => {
    const response = await POST(makeWebhookRequest({ projectId: validProjectId }) as never)
    expect(response.status).toBe(400)
  })

  it('returns 400 when event is not a valid enum value', async () => {
    const response = await POST(
      makeWebhookRequest({ projectId: validProjectId, event: 'invalid_event' }) as never
    )
    expect(response.status).toBe(400)
  })

  // ---- Webhook Signature Verification ----

  it('returns 401 when webhook secret is set but no signature header provided', async () => {
    process.env.FRAMER_WEBHOOK_SECRET = 'test-secret-123'

    const body = { projectId: validProjectId, event: 'build_completed' }
    const response = await POST(makeWebhookRequest(body, { signature: null }) as never)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.message).toContain('Missing webhook signature')
  })

  it('returns 401 when webhook signature does not match', async () => {
    process.env.FRAMER_WEBHOOK_SECRET = 'test-secret-123'

    const body = { projectId: validProjectId, event: 'build_completed' }
    const response = await POST(
      makeWebhookRequest(body, { signature: 'invalid-signature-hex' }) as never
    )
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.message).toContain('Invalid webhook signature')
  })

  it('accepts valid HMAC signature when webhook secret is set', async () => {
    const secret = 'test-secret-123'
    process.env.FRAMER_WEBHOOK_SECRET = secret

    const body = { projectId: validProjectId, event: 'build_completed' }
    const bodyStr = JSON.stringify(body)
    const validSignature = await computeHmacSignature(bodyStr, secret)

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body, { signature: validSignature }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('skips signature verification when no webhook secret is configured', async () => {
    // No FRAMER_WEBHOOK_SECRET set
    const body = { projectId: validProjectId, event: 'build_completed' }

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    expect(response.status).toBe(200)
  })

  // ---- Event Mapping ----

  it('maps build_started to PUSHING status', async () => {
    const body = { projectId: validProjectId, event: 'build_started' }

    setupDbSelect({ id: validProjectId })
    const setMock = setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('PUSHING')
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ deliveryStatus: 'PUSHING' }))
  })

  it('maps build_completed to PUSHED status', async () => {
    const body = { projectId: validProjectId, event: 'build_completed' }

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('PUSHED')
  })

  it('maps build_failed to FAILED status', async () => {
    const body = { projectId: validProjectId, event: 'build_failed' }

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('FAILED')
  })

  it('maps deployed event to DEPLOYED status and sets deployedUrl from data', async () => {
    const body = {
      projectId: validProjectId,
      event: 'deployed',
      data: { url: 'https://mysite.framer.website' },
    }

    setupDbSelect({ id: validProjectId })
    const setMock = setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('DEPLOYED')
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryStatus: 'DEPLOYED',
        framerDeployedUrl: 'https://mysite.framer.website',
      })
    )
  })

  it('does not set framerDeployedUrl when deployed event has no data.url', async () => {
    const body = {
      projectId: validProjectId,
      event: 'deployed',
      data: {},
    }

    setupDbSelect({ id: validProjectId })
    const setMock = setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.status).toBe('DEPLOYED')
    // The update should NOT include framerDeployedUrl when data.url is missing
    expect(setMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ framerDeployedUrl: expect.anything() })
    )
  })

  // ---- Project Not Found ----

  it('returns 404 when project does not exist', async () => {
    const body = { projectId: validProjectId, event: 'build_completed' }
    setupDbSelect(null)

    const response = await POST(makeWebhookRequest(body) as never)
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.message).toContain('Website project')
  })

  // ---- Optional data field ----

  it('accepts webhook without data field', async () => {
    const body = { projectId: validProjectId, event: 'build_completed' }

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    expect(response.status).toBe(200)
  })

  it('accepts webhook with extra data fields', async () => {
    const body = {
      projectId: validProjectId,
      event: 'build_completed',
      data: { buildId: 'build-123', duration: 45 },
    }

    setupDbSelect({ id: validProjectId })
    setupDbUpdate()

    const response = await POST(makeWebhookRequest(body) as never)
    expect(response.status).toBe(200)
  })
})
