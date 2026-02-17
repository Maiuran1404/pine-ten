import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/constants/reference-libraries', () => ({
  analyzeColorBucketFromHex: vi.fn((hex: string) => {
    // Simple mock implementation
    const cleanHex = hex.replace('#', '')
    const r = parseInt(cleanHex.slice(0, 2), 16)
    const b = parseInt(cleanHex.slice(4, 6), 16)
    const warmth = (r - b) / 255
    if (warmth > 0.2) return 'warm'
    if (warmth < -0.2) return 'cool'
    return 'neutral'
  }),
}))

const mockQuery = {
  users: {
    findFirst: vi.fn(),
  },
}

vi.mock('@/db', () => ({
  db: {
    query: mockQuery,
  },
}))

vi.mock('@/db/schema', () => ({
  users: { id: 'id' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
}))

const { extractStyleDNA, getStyleDNASummary } = await import('./style-dna')

describe('extractStyleDNA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when user has no company', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({ company: null })
    const result = await extractStyleDNA('user-1')
    expect(result).toBeNull()
  })

  it('returns null when user not found', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce(undefined)
    const result = await extractStyleDNA('user-1')
    expect(result).toBeNull()
  })

  it('extracts DNA from company with full brand data', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({
      company: {
        primaryColor: '#FF5500', // warm orange
        secondaryColor: '#0055FF', // cool blue
        accentColor: '#00FF55', // green
        brandColors: [],
        primaryFont: 'Inter',
        secondaryFont: 'Georgia',
        industry: 'technology',
        logoUrl: 'https://example.com/logo.png',
      },
    })

    const result = await extractStyleDNA('user-1')
    expect(result).not.toBeNull()
    expect(result!.colorDNA).toBeDefined()
    expect(result!.typographyDNA).toBeDefined()
    expect(result!.recommendedAxes).toBeDefined()
    expect(result!.recommendedAxes.length).toBeGreaterThan(0)
    expect(result!.dataQualityScore).toBeGreaterThan(0)
  })

  it('returns default color DNA when no colors provided', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({
      company: {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        brandColors: null,
        primaryFont: null,
        secondaryFont: null,
        industry: null,
        logoUrl: null,
      },
    })

    const result = await extractStyleDNA('user-1')
    expect(result).not.toBeNull()
    expect(result!.colorDNA.temperature).toBe('neutral')
    expect(result!.colorDNA.temperatureScore).toBe(50)
    expect(result!.dataQualityScore).toBe(0)
  })

  it('classifies sans-serif font as modern personality', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({
      company: {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        brandColors: null,
        primaryFont: 'Inter',
        secondaryFont: null,
        industry: null,
        logoUrl: null,
      },
    })

    const result = await extractStyleDNA('user-1')
    expect(result!.typographyDNA.primaryStyle).toBe('sans-serif')
    expect(result!.typographyDNA.personality).toBe('modern')
  })

  it('classifies serif font as elegant personality', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({
      company: {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        brandColors: null,
        primaryFont: 'Playfair Display',
        secondaryFont: null,
        industry: null,
        logoUrl: null,
      },
    })

    const result = await extractStyleDNA('user-1')
    expect(result!.typographyDNA.primaryStyle).toBe('serif')
    expect(result!.typographyDNA.personality).toBe('elegant')
  })

  it('includes industry insights for known industry', async () => {
    mockQuery.users.findFirst.mockResolvedValueOnce({
      company: {
        primaryColor: null,
        secondaryColor: null,
        accentColor: null,
        brandColors: null,
        primaryFont: null,
        secondaryFont: null,
        industry: 'technology',
        logoUrl: null,
      },
    })

    const result = await extractStyleDNA('user-1')
    expect(result!.industryInsights).not.toBeNull()
    expect(result!.industryInsights!.commonStyles).toContain('tech')
  })
})

describe('getStyleDNASummary', () => {
  it('returns "Modern & Dynamic" for high modernity and energy', () => {
    const summary = getStyleDNASummary({
      colorDNA: {
        temperature: 'cool',
        temperatureScore: 80,
        saturation: 'vibrant',
        saturationScore: 70,
        contrast: 'high',
        contrastScore: 60,
        dominantHue: 'blue',
      },
      typographyDNA: {
        primaryStyle: 'sans-serif',
        secondaryStyle: 'unknown',
        personality: 'modern',
      },
      energyLevel: 70,
      densityLevel: 50,
      formalityLevel: 50,
      modernityLevel: 80,
      recommendedAxes: [{ axis: 'tech', confidence: 90, reason: 'Cool colors' }],
      industryInsights: null,
      brandPersonality: ['innovative', 'dynamic'],
      dataQualityScore: 80,
    })
    expect(summary.headline).toBe('Modern & Dynamic')
    expect(summary.topStyles).toContain('tech')
  })

  it('returns "Professional & Refined" for high formality', () => {
    const summary = getStyleDNASummary({
      colorDNA: {
        temperature: 'neutral',
        temperatureScore: 50,
        saturation: 'balanced',
        saturationScore: 50,
        contrast: 'medium',
        contrastScore: 50,
        dominantHue: null,
      },
      typographyDNA: {
        primaryStyle: 'serif',
        secondaryStyle: 'sans-serif',
        personality: 'professional',
      },
      energyLevel: 50,
      densityLevel: 50,
      formalityLevel: 80,
      modernityLevel: 50,
      recommendedAxes: [{ axis: 'corporate', confidence: 80, reason: 'Professional' }],
      industryInsights: null,
      brandPersonality: ['professional'],
      dataQualityScore: 60,
    })
    expect(summary.headline).toBe('Professional & Refined')
  })

  it('returns "Balanced & Versatile" as fallback', () => {
    const summary = getStyleDNASummary({
      colorDNA: {
        temperature: 'neutral',
        temperatureScore: 50,
        saturation: 'balanced',
        saturationScore: 50,
        contrast: 'medium',
        contrastScore: 50,
        dominantHue: null,
      },
      typographyDNA: { primaryStyle: 'unknown', secondaryStyle: 'unknown', personality: 'neutral' },
      energyLevel: 50,
      densityLevel: 50,
      formalityLevel: 50,
      modernityLevel: 50,
      recommendedAxes: [{ axis: 'minimal', confidence: 50, reason: 'General fit' }],
      industryInsights: null,
      brandPersonality: [],
      dataQualityScore: 20,
    })
    expect(summary.headline).toBe('Balanced & Versatile')
  })
})
