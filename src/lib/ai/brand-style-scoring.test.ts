import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DB - use a configurable query result
let queryResult: unknown[] = []
const mockFindFirst = vi.fn()

vi.mock('@/db', () => {
  // Create a chainable builder that always resolves to queryResult
  function createChain(): Record<string, (...args: unknown[]) => unknown> {
    const chain: Record<string, (...args: unknown[]) => unknown> = {}
    const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset']
    for (const method of methods) {
      chain[method] = () => chain
    }
    // Make the chain thenable so await resolves to queryResult
    chain.then = (resolve: (value: unknown) => void) => {
      resolve(queryResult)
      return chain
    }
    return chain
  }

  return {
    db: {
      query: {
        users: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      },
      select: () => createChain(),
    },
  }
})

// Mock schema (need the table references for eq/and calls)
vi.mock('@/db/schema', () => ({
  deliverableStyleReferences: {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'image_url',
    deliverableType: 'deliverable_type',
    styleAxis: 'style_axis',
    subStyle: 'sub_style',
    semanticTags: 'semantic_tags',
    featuredOrder: 'featured_order',
    displayOrder: 'display_order',
    usageCount: 'usage_count',
    createdAt: 'created_at',
    isActive: 'is_active',
    industries: 'industries',
    moodKeywords: 'mood_keywords',
    targetAudience: 'target_audience',
  },
  users: { id: 'id' },
  companies: {},
}))

// Mock drizzle-orm functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => col),
}))

// Mock selection-history
vi.mock('./selection-history', () => ({
  getHistoryBoostScores: vi.fn().mockResolvedValue(new Map()),
}))

// Mock style-dna
vi.mock('./style-dna', () => ({
  extractStyleDNA: vi.fn().mockResolvedValue(null),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock reference-libraries (only the function)
vi.mock('@/lib/constants/reference-libraries', async () => {
  return {
    analyzeColorBucketFromHex: vi.fn((hex: string) => {
      if (!hex) return 'neutral'
      const clean = hex.replace('#', '')
      const r = parseInt(clean.slice(0, 2), 16)
      const b = parseInt(clean.slice(4, 6), 16)
      const warmth = (r - b) / 255
      if (warmth > 0.2) return 'warm'
      if (warmth < -0.2) return 'cool'
      return 'neutral'
    }),
  }
})

import { getBrandAwareStyles } from './brand-style-scoring'

function makeStyle(
  overrides: Partial<{
    id: string
    name: string
    description: string | null
    imageUrl: string
    deliverableType: string
    styleAxis: string
    subStyle: string | null
    semanticTags: string[]
    featuredOrder: number
    displayOrder: number
    usageCount: number
    createdAt: Date
    industries: string[]
    moodKeywords: string[]
    targetAudience: string | null
  }> = {}
) {
  return {
    id: overrides.id ?? 'style-1',
    name: overrides.name ?? 'Bold Style',
    description: overrides.description ?? 'A bold design',
    imageUrl: overrides.imageUrl ?? '/img/bold.png',
    deliverableType: overrides.deliverableType ?? 'instagram_post',
    styleAxis: overrides.styleAxis ?? 'bold',
    subStyle: overrides.subStyle ?? null,
    semanticTags: overrides.semanticTags ?? ['dynamic', 'high-contrast'],
    featuredOrder: overrides.featuredOrder ?? 0,
    displayOrder: overrides.displayOrder ?? 0,
    usageCount: overrides.usageCount ?? 10,
    createdAt: overrides.createdAt ?? new Date('2025-01-01'),
    industries: overrides.industries ?? [],
    moodKeywords: overrides.moodKeywords ?? [],
    targetAudience: overrides.targetAudience ?? null,
  }
}

describe('getBrandAwareStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = []
  })

  it('should return scored styles when user has no company', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = [
      makeStyle({ id: 's1', name: 'Bold', styleAxis: 'bold', usageCount: 20 }),
      makeStyle({ id: 's2', name: 'Minimal', styleAxis: 'minimal', usageCount: 5 }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')

    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('brandMatchScore')
    expect(result[0]).toHaveProperty('matchReason')
    expect(result[0]).toHaveProperty('scoreFactors')
  })

  it('should return scored styles when user has company with brand colors', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      company: {
        primaryColor: '#1a73e8', // blue = cool
        secondaryColor: '#4285f4',
        accentColor: '#34a853',
        brandColors: [],
        industry: 'technology',
      },
    })
    queryResult = [
      makeStyle({ id: 's1', styleAxis: 'tech', usageCount: 15 }),
      makeStyle({ id: 's2', styleAxis: 'playful', usageCount: 10 }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')

    expect(result).toHaveLength(2)
    const techStyle = result.find((s) => s.styleAxis === 'tech')
    const playfulStyle = result.find((s) => s.styleAxis === 'playful')
    expect(techStyle).toBeDefined()
    expect(playfulStyle).toBeDefined()
    expect(techStyle!.brandMatchScore).toBeGreaterThanOrEqual(0)
    expect(techStyle!.brandMatchScore).toBeLessThanOrEqual(100)
  })

  it('should apply context scoring when context is provided', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = [
      makeStyle({
        id: 's1',
        styleAxis: 'bold',
        semanticTags: ['fitness', 'gym', 'workout'],
        industries: ['fitness'],
        moodKeywords: ['energetic'],
      }),
      makeStyle({
        id: 's2',
        styleAxis: 'corporate',
        semanticTags: ['formal', 'business'],
        industries: ['finance'],
      }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1', {
      context: {
        topic: 'fitness app',
        industry: 'fitness',
        keywords: ['gym', 'workout'],
      },
    })

    expect(result).toHaveLength(2)
    result.forEach((style) => {
      expect(style.scoreFactors).toBeDefined()
      expect(style.scoreFactors!.brand).toBeGreaterThanOrEqual(0)
    })
  })

  it('should respect limit option', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = Array.from({ length: 10 }, (_, i) =>
      makeStyle({ id: `s${i}`, name: `Style ${i}`, styleAxis: 'bold' })
    )

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1', {
      limit: 3,
    })

    expect(result).toHaveLength(3)
  })

  it('should return empty array when no styles exist and no fallbacks', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = []

    // presentation_slide has no fallbacks configured
    const result = await getBrandAwareStyles('presentation_slide' as never, 'user-1')

    expect(result).toEqual([])
  })

  it('should include matchReasons array in results', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = [makeStyle({ id: 's1', usageCount: 100 })]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')

    expect(result[0].matchReasons).toBeDefined()
    expect(Array.isArray(result[0].matchReasons)).toBe(true)
  })

  it('should handle includeAllAxes option to return one style per axis', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = [
      makeStyle({ id: 's1', styleAxis: 'bold', usageCount: 20 }),
      makeStyle({ id: 's2', styleAxis: 'bold', usageCount: 15 }),
      makeStyle({ id: 's3', styleAxis: 'minimal', usageCount: 10 }),
      makeStyle({ id: 's4', styleAxis: 'minimal', usageCount: 5 }),
      makeStyle({ id: 's5', styleAxis: 'tech', usageCount: 8 }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1', {
      includeAllAxes: true,
    })

    // Should have at most one per axis
    const axes = result.map((s) => s.styleAxis)
    const uniqueAxes = new Set(axes)
    expect(uniqueAxes.size).toBe(axes.length)
    expect(uniqueAxes.size).toBe(3) // bold, minimal, tech
  })

  it('should sort results by brandMatchScore descending', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'user-1', company: null })
    queryResult = [
      makeStyle({ id: 's1', styleAxis: 'bold', usageCount: 1 }),
      makeStyle({ id: 's2', styleAxis: 'minimal', usageCount: 50 }),
      makeStyle({ id: 's3', styleAxis: 'tech', usageCount: 100 }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].brandMatchScore).toBeGreaterThanOrEqual(result[i].brandMatchScore)
    }
  })

  it('should produce scores between 0 and 100', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      company: {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        accentColor: '#0000FF',
        brandColors: ['#FFFF00', '#FF00FF'],
        industry: 'entertainment',
      },
    })
    queryResult = [
      makeStyle({ id: 's1', styleAxis: 'bold', usageCount: 100 }),
      makeStyle({ id: 's2', styleAxis: 'minimal', usageCount: 0 }),
      makeStyle({
        id: 's3',
        styleAxis: 'corporate',
        usageCount: 50,
        createdAt: new Date(),
      }),
    ]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')

    result.forEach((style) => {
      expect(style.brandMatchScore).toBeGreaterThanOrEqual(0)
      expect(style.brandMatchScore).toBeLessThanOrEqual(100)
    })
  })

  it('should handle errors from style DNA extraction gracefully', async () => {
    const { extractStyleDNA } = await import('./style-dna')
    vi.mocked(extractStyleDNA).mockRejectedValueOnce(new Error('DNA extraction failed'))

    mockFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      company: {
        primaryColor: '#333',
        secondaryColor: null,
        accentColor: null,
        brandColors: [],
        industry: 'tech',
      },
    })
    queryResult = [makeStyle({ id: 's1', styleAxis: 'tech' })]

    // Should not throw
    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')
    expect(result).toHaveLength(1)
  })

  it('should handle errors from history boost gracefully', async () => {
    const { getHistoryBoostScores } = await import('./selection-history')
    vi.mocked(getHistoryBoostScores).mockRejectedValueOnce(new Error('History error'))

    mockFindFirst.mockResolvedValueOnce({
      id: 'user-1',
      company: {
        primaryColor: '#333',
        secondaryColor: null,
        accentColor: null,
        brandColors: [],
        industry: 'tech',
      },
    })
    queryResult = [makeStyle({ id: 's1', styleAxis: 'tech' })]

    const result = await getBrandAwareStyles('instagram_post' as never, 'user-1')
    expect(result).toHaveLength(1)
  })
})
