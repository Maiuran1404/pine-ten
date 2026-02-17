import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/validations', () => ({
  generateOutlineSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user-1',
          company: { name: 'Test Co', industry: 'SaaS', description: 'A SaaS platform' },
        }),
      },
    },
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('@/components/chat/brief-panel/types', () => ({
  PLATFORM_DISPLAY_NAMES: {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    facebook: 'Facebook',
    twitter: 'Twitter/X',
  },
  INTENT_DESCRIPTIONS: {
    signups: 'Drive sign-ups and registrations',
    authority: 'Build thought leadership and authority',
    awareness: 'Increase brand awareness',
    sales: 'Drive direct sales',
    engagement: 'Boost community engagement',
    education: 'Educate your audience',
    announcement: 'Make an announcement',
  },
}))

vi.mock('@/lib/constants/platform-dimensions', () => ({
  getDefaultDimension: vi.fn().mockReturnValue({
    width: 1080,
    height: 1080,
    label: 'Square',
    aspectRatio: '1:1',
  }),
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
    url: 'http://localhost/api/brief/generate-outline',
    method: 'POST',
    json: vi.fn().mockResolvedValue(body),
    headers: { get: () => null, has: () => false },
  }
}

function setupAuth(userId = 'user-1') {
  mockRequireAuth.mockResolvedValue({
    user: { id: userId, name: 'Test User', email: 'test@test.com' },
  })
}

const validBody = {
  topic: 'Product Launch Campaign',
  platform: 'instagram',
  contentType: 'post',
  intent: 'awareness',
  durationDays: 14,
  audienceName: 'Tech Founders',
  brandTone: 'Professional',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/brief/generate-outline', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest(validBody) as never)
    expect(response.status).toBe(401)
  })

  it('generates outline from AI response', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            items: [
              {
                title: 'Brand Story Introduction',
                description: 'Create an engaging post introducing the brand.',
                theme: 'Brand Story',
              },
              {
                title: 'Product Feature Highlight',
                description: 'Showcase a key product feature with compelling visuals.',
                theme: 'Feature Highlight',
              },
              {
                title: 'Customer Success Story',
                description: 'Share a customer testimonial with results.',
                theme: 'Social Proof',
              },
            ],
          }),
        },
      ],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.outline).toBeDefined()
    expect(data.data.outline.totalItems).toBe(3)
    expect(data.data.outline.weekGroups).toBeDefined()
    expect(data.data.outline.weekGroups.length).toBeGreaterThan(0)
  })

  it('handles AI response in markdown code block', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"items":[{"title":"Post 1","description":"Desc 1","theme":"Theme 1"}]}\n```',
        },
      ],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.outline.totalItems).toBe(1)
  })

  it('falls back to generated items when AI returns invalid JSON', async () => {
    setupAuth()
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON at all' }],
    })

    const response = await POST(makeRequest(validBody) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.outline).toBeDefined()
    // Fallback items should be generated
    expect(data.data.outline.totalItems).toBeGreaterThan(0)
  })

  it('generates correct week structure for multi-week plans', async () => {
    setupAuth()
    const items = Array.from({ length: 7 }, (_, i) => ({
      title: `Post ${i + 1}`,
      description: `Description ${i + 1}`,
      theme: 'Theme',
    }))
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ items }) }],
    })

    const body = { ...validBody, durationDays: 14 }

    const response = await POST(makeRequest(body) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.outline.weekGroups.length).toBe(2) // 14 days = 2 weeks
  })
})
