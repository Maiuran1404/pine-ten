import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockRequireAuth = vi.fn()
vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('@/lib/validations', () => ({
  extractBrandRequestSchema: {
    parse: vi.fn((data: unknown) => data),
  },
}))

// Mock Firecrawl
const mockScrape = vi.fn()
vi.mock('@mendable/firecrawl-js', () => ({
  default: class MockFirecrawl {
    scrape = (...args: unknown[]) => mockScrape(...args)
  },
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
    url: 'http://localhost/api/brand/extract',
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

const mockScrapeResult = {
  markdown: '# Test Company\nWe build great products.',
  screenshot: 'https://screenshot.png',
  links: ['https://twitter.com/test', 'https://linkedin.com/test'],
  metadata: {
    title: 'Test Company | Home',
    description: 'We build great products',
    ogImage: 'https://og.png',
    favicon: 'https://favicon.ico',
  },
  branding: {
    colors: {
      primary: '#3B82F6',
      accent: '#10B981',
      background: '#FFFFFF',
      textPrimary: '#1F2937',
      link: '#6366F1',
    },
    typography: { fontFamilies: { primary: 'Inter' } },
    fonts: [{ family: 'Inter' }],
    images: { logo: 'https://logo.png', favicon: 'https://favicon.ico' },
    confidence: { colors: 0.8, buttons: 0.5, overall: 0.6 },
  },
}

const mockClaudeResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        name: 'Test Company',
        description: 'We build great products',
        tagline: 'Building the future',
        industry: 'Technology',
        industryArchetype: 'tech',
        logoUrl: 'https://logo.png',
        faviconUrl: 'https://favicon.ico',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#6366F1',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        brandColors: ['#3B82F6', '#10B981', '#6366F1'],
        primaryFont: 'Inter',
        secondaryFont: null,
        socialLinks: { twitter: 'https://twitter.com/test' },
        contactEmail: null,
        contactPhone: null,
        keywords: ['tech', 'products'],
        visualStyle: 'modern-sleek',
        brandTone: 'professional-trustworthy',
        feelPlayfulSerious: 65,
        feelBoldMinimal: 40,
        feelExperimentalClassic: 55,
        feelFriendlyProfessional: 70,
        feelPremiumAccessible: 60,
        signalTone: 35,
        signalDensity: 50,
        signalWarmth: 45,
        signalEnergy: 55,
        audiences: [
          {
            name: 'Tech Founders',
            isPrimary: true,
            demographics: { ageRange: { min: 25, max: 45 }, income: 'high' },
            firmographics: { companySize: ['1-50'], industries: ['Technology'] },
            psychographics: { painPoints: ['Scale'], goals: ['Growth'] },
            behavioral: { buyingProcess: 'considered' },
            confidence: 80,
          },
        ],
      }),
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/brand/extract', () => {
  it('returns 401 when not authenticated', async () => {
    const { APIError, ErrorCodes } = await import('@/lib/errors')
    mockRequireAuth.mockRejectedValue(new APIError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401))

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    expect(response.status).toBe(401)
  })

  it('returns 400 when Firecrawl scrape fails', async () => {
    setupAuth()
    mockScrape.mockRejectedValue(new Error('Scrape failed'))

    const response = await POST(makeRequest({ websiteUrl: 'https://bad-url.com' }) as never)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.message).toContain('scrape')
  })

  it('extracts brand data successfully', async () => {
    setupAuth()
    mockScrape.mockResolvedValue(mockScrapeResult)
    mockCreate.mockResolvedValue(mockClaudeResponse)

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.name).toBe('Test Company')
    expect(data.data.website).toBe('https://example.com')
    expect(data.data.visualStyle).toBe('modern-sleek')
    expect(data.data.audiences).toBeDefined()
    expect(data.data.audiences.length).toBeGreaterThan(0)
  })

  it('uses Firecrawl high-confidence colors over Claude colors', async () => {
    setupAuth()
    mockScrape.mockResolvedValue(mockScrapeResult) // branding.confidence.colors = 0.8
    mockCreate.mockResolvedValue(mockClaudeResponse)

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Firecrawl high-confidence colors should be used
    expect(data.data.primaryColor).toBe('#3B82F6')
  })

  it('falls back to default brand data when Claude analysis fails', async () => {
    setupAuth()
    mockScrape.mockResolvedValue({
      ...mockScrapeResult,
      branding: {
        ...mockScrapeResult.branding,
        confidence: { colors: 0.1, buttons: 0.1, overall: 0.1 },
      },
    })
    mockCreate.mockRejectedValue(new Error('Claude API error'))

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Falls back to default brand data from metadata
    expect(data.data.name).toBeDefined()
    expect(data.data.website).toBe('https://example.com')
  })

  it('handles Claude returning invalid JSON with fallback', async () => {
    setupAuth()
    mockScrape.mockResolvedValue({
      ...mockScrapeResult,
      branding: {
        ...mockScrapeResult.branding,
        confidence: { colors: 0.1, buttons: 0.1, overall: 0.1 },
      },
    })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not valid JSON at all' }],
    })

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    const data = await response.json()

    // Should fall back to default data
    expect(response.status).toBe(200)
    expect(data.data.website).toBe('https://example.com')
  })

  it('normalizes URL without protocol', async () => {
    setupAuth()
    mockScrape.mockResolvedValue(mockScrapeResult)
    mockCreate.mockResolvedValue(mockClaudeResponse)

    const response = await POST(makeRequest({ websiteUrl: 'example.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.website).toBe('https://example.com')
    expect(mockScrape).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ formats: expect.arrayContaining(['markdown']) })
    )
  })

  it('validates and defaults invalid visualStyle and brandTone', async () => {
    setupAuth()
    mockScrape.mockResolvedValue(mockScrapeResult)
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...JSON.parse(mockClaudeResponse.content[0].text),
            visualStyle: 'invalid-style',
            brandTone: 'invalid-tone',
          }),
        },
      ],
    })

    const response = await POST(makeRequest({ websiteUrl: 'https://example.com' }) as never)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.visualStyle).toBe('modern-sleek') // default
    expect(data.data.brandTone).toBe('professional-trustworthy') // default
  })
})
