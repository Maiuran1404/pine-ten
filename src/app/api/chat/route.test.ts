import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

const mockChat = vi.fn()
const mockParseTaskFromChat = vi.fn()
const mockGetStyleReferencesByCategory = vi.fn()
vi.mock('@/lib/ai/chat', () => ({
  chat: (...args: unknown[]) => mockChat(...args),
  parseTaskFromChat: (...args: unknown[]) => mockParseTaskFromChat(...args),
  getStyleReferencesByCategory: (...args: unknown[]) => mockGetStyleReferencesByCategory(...args),
}))

const mockWithRateLimit = vi.fn()
vi.mock('@/lib/rate-limit', () => ({
  withRateLimit: (handler: unknown) => {
    mockWithRateLimit(handler)
    return handler
  },
}))

vi.mock('@/lib/config', () => ({
  config: {
    rateLimits: { chat: { maxRequests: 30, windowMs: 60000 } },
  },
}))

vi.mock('@/lib/ai/brand-style-scoring', () => ({
  getBrandAwareStyles: vi.fn().mockResolvedValue([]),
  getBrandAwareStylesOfAxis: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/ai/semantic-style-search', () => ({
  searchStylesByQuery: vi.fn().mockResolvedValue([]),
  aiEnhancedStyleSearch: vi.fn().mockResolvedValue([]),
  refineStyleSearch: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/ai/inference-engine', () => ({
  inferFromMessage: vi.fn().mockReturnValue({}),
  applyInferenceToBrief: vi.fn().mockImplementation((brief: unknown) => brief),
  detectBrandMention: vi.fn().mockReturnValue({ detected: false }),
  analyzeRequestCompleteness: vi.fn().mockReturnValue({ complete: false }),
}))

vi.mock('@/lib/ai/video-references', () => ({
  getVideoReferencesForChat: vi.fn().mockResolvedValue([]),
  isVideoDeliverableType: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/ai/chat-context', () => ({
  extractStyleContext: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/ai/style-filter', () => ({
  autoDetectStyleMarker: vi.fn().mockReturnValue(undefined),
}))

vi.mock('@/lib/constants/reference-libraries', () => ({
  normalizeDeliverableType: vi.fn().mockImplementation((t: unknown) => t),
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user-1',
          company: { id: 'company-1', name: 'Test Co', industry: 'SaaS' },
        }),
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
  audiences: { companyId: 'companyId' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  ilike: vi.fn(),
}))

vi.mock('@/lib/ai/briefing-state-machine', () => ({
  deserialize: vi.fn().mockReturnValue({
    stage: 'DISCOVERY',
    brief: { audience: { value: null }, platform: {}, intent: {}, topic: {} },
    messageCount: 0,
    turnsInCurrentStage: 0,
    styleKeywords: [],
    inspirationRefs: [],
    deliverableCategory: null,
  }),
  serialize: vi.fn().mockReturnValue({ stage: 'DISCOVERY' }),
  evaluateTransitions: vi.fn().mockReturnValue('DISCOVERY'),
}))

vi.mock('@/lib/ai/briefing-tone', () => ({
  calibrateTone: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/ai/briefing-prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('System prompt'),
}))

vi.mock('@/lib/ai/briefing-extractors', () => ({
  extractStyleKeywords: vi.fn().mockReturnValue([]),
  extractInspirationReferences: vi.fn().mockReturnValue([]),
  extractAudienceSignals: vi.fn().mockReturnValue([]),
  extractIndustrySignals: vi.fn().mockReturnValue([]),
  resolveDeliverableCategory: vi.fn().mockReturnValue('unknown'),
}))

vi.mock('@/lib/ai/briefing-response-parser', () => ({
  parseStructuredOutput: vi.fn().mockReturnValue({ success: false }),
  parseStrategicReview: vi.fn().mockReturnValue({ success: false }),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/chat',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
    ip: '127.0.0.1',
  }
}

function setupAuth(userId = 'user-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChat.mockResolvedValue({
    content: 'Hello! How can I help you today?',
    styleReferences: [],
    deliverableStyleMarker: undefined,
    quickOptions: undefined,
  })
  mockParseTaskFromChat.mockReturnValue(null)
})

describe('POST /api/chat', () => {
  const validBody = {
    messages: [{ role: 'user', content: 'I need a logo design' }],
  }

  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('returns chat response successfully', async () => {
    setupAuth()

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.content).toBe('Hello! How can I help you today?')
  })

  it('passes messages to chat function', async () => {
    setupAuth()

    await POST(makeRequest(validBody) as never)

    expect(mockChat).toHaveBeenCalledWith(
      validBody.messages,
      'user-1',
      expect.objectContaining({}),
      undefined
    )
  })

  it('parses task proposals from response', async () => {
    setupAuth()
    mockChat.mockResolvedValue({
      content: '[TASK_READY]Some task[/TASK_READY] Here is your design.',
      styleReferences: [],
      deliverableStyleMarker: undefined,
      quickOptions: undefined,
    })
    mockParseTaskFromChat.mockReturnValue({
      title: 'Logo Design',
      description: 'Design a logo',
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.taskProposal).toBeDefined()
    // The content should have TASK_READY stripped
    expect(data.content).not.toContain('[TASK_READY]')
  })

  it('strips content markers from response', async () => {
    setupAuth()
    mockChat.mockResolvedValue({
      content:
        'Here is your plan. [STORYBOARD]Scene 1: Intro[/STORYBOARD] [STYLE_CARDS]card1[/STYLE_CARDS]',
      styleReferences: [],
      deliverableStyleMarker: undefined,
      quickOptions: undefined,
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.content).not.toContain('[STORYBOARD]')
    expect(data.content).not.toContain('[STYLE_CARDS]')
  })

  it('handles client style marker for more/different styles', async () => {
    setupAuth()
    const body = {
      messages: [{ role: 'user', content: 'Show me more styles' }],
      selectedStyles: [],
      clientStyleMarker: undefined,
      deliverableStyleMarker: {
        type: 'more',
        deliverableType: 'social_post',
        styleAxis: 'reference',
      },
    }

    // For the client marker path, it goes directly to style fetching
    // without calling chat
    const response = await POST(makeRequest(body) as never)
    await response.json()

    expect(response.status).toBe(200)
  })

  it('returns quick options from AI response', async () => {
    setupAuth()
    mockChat.mockResolvedValue({
      content: 'What kind of design?',
      styleReferences: [],
      deliverableStyleMarker: undefined,
      quickOptions: ['Logo', 'Banner', 'Social Post'],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.quickOptions).toEqual(['Logo', 'Banner', 'Social Post'])
  })

  it('accepts briefing state in request body', async () => {
    setupAuth()
    // Verify that sending briefingState does not cause a validation error (400)
    // The state machine pipeline is complex and may internally error,
    // but the route wraps it in withErrorHandling
    const body = {
      messages: [{ role: 'user', content: 'I need a logo design' }],
      briefingState: {
        stage: 'DISCOVERY',
      },
    }

    const response = await POST(makeRequest(body) as never)

    // Should not be a 400 validation error — the route accepts briefingState
    expect(response.status).not.toBe(400)
  })

  it('exports POST as a function (wrapped with rate limiting)', () => {
    // The POST export is the result of withRateLimit wrapping the handler
    expect(typeof POST).toBe('function')
  })
})
