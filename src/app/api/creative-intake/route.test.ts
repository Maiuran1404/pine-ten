import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/validations', () => ({
  creativeIntakeSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

const mockGetSystemPrompt = vi.fn()
const mockParseIntakeResponse = vi.fn()
vi.mock('@/lib/creative-intake/prompts', () => ({
  getSystemPrompt: (...args: unknown[]) => mockGetSystemPrompt(...args),
  parseIntakeResponse: (...args: unknown[]) => mockParseIntakeResponse(...args),
}))

const mockGetFlowStep = vi.fn()
const mockGetNextStep = vi.fn()
const mockApplySmartDefaults = vi.fn()
vi.mock('@/lib/creative-intake/flow-config', () => ({
  getFlowStep: (...args: unknown[]) => mockGetFlowStep(...args),
  getNextStep: (...args: unknown[]) => mockGetNextStep(...args),
  applySmartDefaults: (...args: unknown[]) => mockApplySmartDefaults(...args),
}))

// Mock Anthropic SDK
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: (...args: unknown[]) => mockCreate(...args) }
  },
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return {
    url: 'http://localhost/api/creative-intake',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth() {
  mockRequireAuth.mockResolvedValue({
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
  })
}

const validBody = {
  serviceType: 'launch_video',
  currentStep: 'context',
  messages: [{ role: 'assistant' as const, content: 'Welcome!' }],
  userMessage: 'I need a product launch video for our new app',
  currentData: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSystemPrompt.mockReturnValue('You are a creative intake assistant.')
  mockGetFlowStep.mockReturnValue({ requiredFields: ['productDescription'] })
  mockGetNextStep.mockReturnValue('style')
  mockApplySmartDefaults.mockImplementation((_type: unknown, data: unknown) => data)
  mockParseIntakeResponse.mockReturnValue({ extractedData: {} })
})

describe('POST /api/creative-intake', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('processes intake message and returns response', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Tell me more about your product.' }],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.response).toBe('Tell me more about your product.')
    expect(data.data.nextStep).toBe('style')
  })

  it('extracts product description from launch_video context step', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Great, what style do you prefer?' }],
    })

    const body = {
      ...validBody,
      userMessage: 'We are launching a new fitness app. The main message is health first.',
    }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.extractedData).toBeDefined()
  })

  it('handles different service types', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'What platforms do you want to target?' }],
    })

    const body = {
      ...validBody,
      serviceType: 'social_ads',
      currentStep: 'product_goal',
      userMessage: 'I want to drive sales for my e-commerce store',
    }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.response).toContain('platforms')
  })

  it('advances to next step', async () => {
    setupAuth()
    mockGetNextStep.mockReturnValue('review')
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Here is your summary.' }],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.nextStep).toBe('review')
  })

  it('passes conversation history to Claude', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Got it.' }],
    })

    const body = {
      ...validBody,
      messages: [
        { role: 'user' as const, content: 'I need a video' },
        { role: 'assistant' as const, content: 'What kind?' },
      ],
    }

    await POST(makeRequest(body) as never)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'I need a video' }),
          expect.objectContaining({ role: 'assistant', content: 'What kind?' }),
        ]),
      })
    )
  })

  it('applies smart defaults to collected data', async () => {
    setupAuth()
    mockApplySmartDefaults.mockReturnValue({ productDescription: 'Test', duration: '60s' })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Ready for review.' }],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.dataWithDefaults).toBeDefined()
    expect(mockApplySmartDefaults).toHaveBeenCalled()
  })
})
