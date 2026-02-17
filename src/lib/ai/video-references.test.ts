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
    videoUrl: 'videoUrl',
    videoThumbnailUrl: 'videoThumbnailUrl',
    videoDuration: 'videoDuration',
    videoTags: 'videoTags',
    deliverableType: 'deliverableType',
    styleAxis: 'styleAxis',
    subStyle: 'subStyle',
    semanticTags: 'semanticTags',
    isActive: 'isActive',
    usageCount: 'usageCount',
    featuredOrder: 'featuredOrder',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  isNotNull: vi.fn((col: unknown) => ({ type: 'isNotNull', col })),
  desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
}))

vi.mock('@/lib/constants/reference-libraries', () => ({
  VIDEO_DELIVERABLE_TYPES: ['instagram_reel', 'video_ad', 'launch_video'],
}))

const { isVideoDeliverableType, extractVideoTagsFromMessage, getVideoReferencesForChat } =
  await import('./video-references')

describe('isVideoDeliverableType', () => {
  it('returns true for launch_video', () => {
    expect(isVideoDeliverableType('launch_video')).toBe(true)
  })

  it('returns true for video_ad', () => {
    expect(isVideoDeliverableType('video_ad')).toBe(true)
  })

  it('returns true for instagram_reel', () => {
    expect(isVideoDeliverableType('instagram_reel')).toBe(true)
  })

  it('returns false for instagram_post', () => {
    expect(isVideoDeliverableType('instagram_post')).toBe(false)
  })

  it('returns false for linkedin_post', () => {
    expect(isVideoDeliverableType('linkedin_post')).toBe(false)
  })
})

describe('extractVideoTagsFromMessage', () => {
  it('detects cinematic style from message', () => {
    const tags = extractVideoTagsFromMessage('I want a cinematic video')
    expect(tags).toContain('cinematic')
  })

  it('detects fast-paced style from "dynamic"', () => {
    const tags = extractVideoTagsFromMessage('Make it dynamic and energetic')
    expect(tags).toContain('fast-paced')
  })

  it('detects tech industry from "software"', () => {
    const tags = extractVideoTagsFromMessage('For our software product')
    expect(tags).toContain('tech')
  })

  it('detects product-showcase format from "product showcase"', () => {
    const tags = extractVideoTagsFromMessage('We need a product showcase')
    expect(tags).toContain('product-showcase')
  })

  it('detects explainer format', () => {
    const tags = extractVideoTagsFromMessage('Can you make an explainer video?')
    expect(tags).toContain('explainer')
  })

  it('detects multiple tags from complex message', () => {
    const tags = extractVideoTagsFromMessage(
      'Create a cinematic product showcase for our tech startup'
    )
    expect(tags).toContain('cinematic')
    expect(tags).toContain('product-showcase')
    expect(tags).toContain('tech')
  })

  it('returns empty array for unrelated message', () => {
    const tags = extractVideoTagsFromMessage('Hello there')
    expect(tags).toHaveLength(0)
  })

  it('deduplicates tags', () => {
    const tags = extractVideoTagsFromMessage('cinematic film movie')
    const cinematicCount = tags.filter((t) => t === 'cinematic').length
    expect(cinematicCount).toBeLessThanOrEqual(1)
  })
})

describe('getVideoReferencesForChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no videos in database', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const result = await getVideoReferencesForChat('launch_video')
    expect(result).toEqual([])
  })
})
