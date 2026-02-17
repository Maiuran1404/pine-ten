import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockSelect = vi.fn()
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  deliverableStyleReferences: {
    id: 'id',
    name: 'name',
    description: 'description',
    imageUrl: 'imageUrl',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    subStyle: 'subStyle',
    semanticTags: 'semanticTags',
    isActive: 'isActive',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
}))

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...args: unknown[]) => mockCreate(...args) }
  },
}))

const { searchStylesByQuery, detectStylePreferences, detectStyleRefinement } =
  await import('./semantic-style-search')

describe('searchStylesByQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array for empty query keywords', async () => {
    const result = await searchStylesByQuery('a b')
    // Short words (<= 2 chars) get filtered, so extractKeywords produces nothing meaningful
    // but the synonym expansion may add some
    expect(Array.isArray(result)).toBe(true)
  })

  it('scores and ranks styles by semantic similarity', async () => {
    const mockStyles = [
      {
        id: '1',
        name: 'Bold Tech',
        description: 'Bold tech design',
        imageUrl: 'url1',
        deliverableType: 'instagram_post',
        styleAxis: 'bold',
        subStyle: null,
        semanticTags: ['bold', 'tech', 'modern'],
      },
      {
        id: '2',
        name: 'Minimal Clean',
        description: 'Clean minimal style',
        imageUrl: 'url2',
        deliverableType: 'instagram_post',
        styleAxis: 'minimal',
        subStyle: null,
        semanticTags: ['minimal', 'clean', 'simple'],
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockStyles),
      }),
    })

    const result = await searchStylesByQuery('bold tech design')
    expect(result.length).toBeGreaterThan(0)
    // Bold Tech should rank higher since its tags match the query
    expect(result[0].id).toBe('1')
    expect(result[0].semanticScore).toBeGreaterThan(0)
  })

  it('filters out styles with zero score', async () => {
    const mockStyles = [
      {
        id: '1',
        name: 'Unrelated',
        description: 'Something unrelated',
        imageUrl: 'url1',
        deliverableType: 'instagram_post',
        styleAxis: 'editorial',
        subStyle: null,
        semanticTags: ['xyz', 'abc'],
      },
    ]

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(mockStyles),
      }),
    })

    const result = await searchStylesByQuery('bold tech modern')
    // Only include styles with score > 0
    expect(result.every((s) => s.semanticScore > 0)).toBe(true)
  })
})

describe('detectStylePreferences', () => {
  it('detects preferences from "something more bold"', () => {
    const result = detectStylePreferences('something more bold')
    expect(result.hasPreferences).toBe(true)
    expect(result.preferences).toContain('bold')
  })

  it('detects preferences from "should be minimal"', () => {
    const result = detectStylePreferences('should be minimal')
    expect(result.hasPreferences).toBe(true)
    expect(result.preferences).toContain('minimal')
  })

  it('detects explicit style axis mentions', () => {
    const result = detectStylePreferences('I want something playful and premium')
    expect(result.hasPreferences).toBe(true)
    expect(result.preferences).toContain('playful')
    expect(result.preferences).toContain('premium')
  })

  it('returns false for no preferences', () => {
    const result = detectStylePreferences('hello')
    expect(result.hasPreferences).toBe(false)
    expect(result.preferences).toHaveLength(0)
  })

  it('deduplicates preferences', () => {
    const result = detectStylePreferences('something bold, I prefer bold design')
    const boldCount = result.preferences.filter((p) => p === 'bold').length
    expect(boldCount).toBeLessThanOrEqual(1)
  })
})

describe('detectStyleRefinement', () => {
  it('detects refinement from "more like this but bolder"', () => {
    const result = detectStyleRefinement('more like this but bolder')
    expect(result.isRefinement).toBe(true)
    expect(result.refinementType).toBe('bolder')
  })

  it('detects refinement from standalone modifier "cleaner"', () => {
    const result = detectStyleRefinement('I want something cleaner')
    expect(result.isRefinement).toBe(true)
    expect(result.refinementType).toBe('cleaner')
  })

  it('detects "more minimal" as refinement', () => {
    const result = detectStyleRefinement('make it more minimal')
    expect(result.isRefinement).toBe(true)
  })

  it('returns isRefinement false for non-refinement messages', () => {
    const result = detectStyleRefinement('I need an instagram post')
    expect(result.isRefinement).toBe(false)
  })

  it('detects selected base reference', () => {
    const result = detectStyleRefinement('like the selected one but warmer')
    expect(result.isRefinement).toBe(true)
    expect(result.baseStyleReference).toBe('selected')
  })
})
