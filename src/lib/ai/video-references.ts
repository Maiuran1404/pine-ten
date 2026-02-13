import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { and, eq, isNotNull, desc } from 'drizzle-orm'
import type { DeliverableType, StyleAxis } from '@/lib/constants/reference-libraries'
import { VIDEO_DELIVERABLE_TYPES } from '@/lib/constants/reference-libraries'
import { logger } from '@/lib/logger'

export interface VideoReference {
  id: string
  name: string
  description: string | null
  imageUrl: string // Thumbnail URL
  videoUrl: string
  videoThumbnailUrl: string | null
  videoDuration: string | null
  videoTags: string[]
  deliverableType: string
  styleAxis: string
  subStyle: string | null
  semanticTags: string[]
  brandMatchScore: number
  matchReason?: string
  isVideoReference: true // Flag to distinguish from image references
}

/**
 * Context for smarter video matching
 */
export interface VideoMatchContext {
  intent?: string // announcement, promotion, educational, etc.
  platform?: string // linkedin, instagram, youtube, etc.
  topic?: string // product, service, brand, etc.
  audience?: string // investors, customers, general, etc.
  aiResponse?: string // AI's response describing the video direction
}

/**
 * Check if a deliverable type should show video references
 */
export function isVideoDeliverableType(deliverableType: DeliverableType | string): boolean {
  return (VIDEO_DELIVERABLE_TYPES as readonly string[]).includes(deliverableType)
}

/**
 * Get video references for video-related deliverable types
 * These are shown in the chat when users request launch videos, video ads, etc.
 */
export async function getVideoReferences(options?: {
  deliverableType?: DeliverableType
  tags?: string[]
  styleAxis?: StyleAxis
  limit?: number
  offset?: number
}): Promise<VideoReference[]> {
  const limit = options?.limit || 8
  const offset = options?.offset || 0

  // Build conditions
  const conditions = [
    isNotNull(deliverableStyleReferences.videoUrl),
    eq(deliverableStyleReferences.isActive, true),
  ]

  if (options?.deliverableType) {
    conditions.push(eq(deliverableStyleReferences.deliverableType, options.deliverableType))
  }

  if (options?.styleAxis) {
    conditions.push(eq(deliverableStyleReferences.styleAxis, options.styleAxis))
  }

  // Fetch video references
  let videos = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      videoUrl: deliverableStyleReferences.videoUrl,
      videoThumbnailUrl: deliverableStyleReferences.videoThumbnailUrl,
      videoDuration: deliverableStyleReferences.videoDuration,
      videoTags: deliverableStyleReferences.videoTags,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
      usageCount: deliverableStyleReferences.usageCount,
      featuredOrder: deliverableStyleReferences.featuredOrder,
    })
    .from(deliverableStyleReferences)
    .where(and(...conditions))
    .orderBy(deliverableStyleReferences.featuredOrder, desc(deliverableStyleReferences.usageCount))
    .limit(limit + 10) // Fetch extra to allow tag filtering
    .offset(offset)

  // Filter by tags if provided
  if (options?.tags && options.tags.length > 0) {
    const searchTags = options.tags.map((t) => t.toLowerCase())
    videos = videos.filter((v) => {
      const videoTags = (v.videoTags || []).map((t) => t.toLowerCase())
      return searchTags.some((tag) => videoTags.includes(tag))
    })
  }

  // Score videos based on matching criteria
  return videos.slice(0, limit).map((video) => {
    let score = 50 // Base score
    const matchReasons: string[] = []

    // Boost popular videos
    if (video.usageCount && video.usageCount > 5) {
      score += 15
      matchReasons.push('Popular choice')
    }

    // Boost featured videos
    if (video.featuredOrder === 0) {
      score += 10
      matchReasons.push('Featured style')
    }

    // Boost videos with matching tags
    if (options?.tags && options.tags.length > 0) {
      const videoTags = (video.videoTags || []).map((t) => t.toLowerCase())
      const matchingTags = options.tags.filter((t) => videoTags.includes(t.toLowerCase()))
      if (matchingTags.length > 0) {
        score += matchingTags.length * 10
        matchReasons.push(`Matches: ${matchingTags.slice(0, 2).join(', ')}`)
      }
    }

    return {
      id: video.id,
      name: video.name,
      description: video.description,
      imageUrl: video.videoThumbnailUrl || video.imageUrl,
      videoUrl: video.videoUrl!,
      videoThumbnailUrl: video.videoThumbnailUrl,
      videoDuration: video.videoDuration,
      videoTags: video.videoTags || [],
      deliverableType: video.deliverableType,
      styleAxis: video.styleAxis,
      subStyle: video.subStyle,
      semanticTags: video.semanticTags || [],
      brandMatchScore: Math.min(100, score),
      matchReason: matchReasons.length > 0 ? matchReasons[0] : 'Video style reference',
      isVideoReference: true as const,
    }
  })
}

/**
 * Get video references by tags (for semantic matching)
 */
export async function getVideoReferencesByTags(
  tags: string[],
  limit: number = 6
): Promise<VideoReference[]> {
  return getVideoReferences({ tags, limit })
}

/**
 * Intent-to-style mapping for semantic matching
 * Maps brief intents to video style characteristics
 */
const INTENT_STYLE_MAP: Record<string, { tags: string[]; styleWeights: Record<string, number> }> = {
  announcement: {
    tags: ['cinematic', 'dramatic', 'epic', 'premium', 'launch'],
    styleWeights: { cinematic: 30, professional: 20, 'motion-graphics': 15 },
  },
  promotion: {
    tags: ['dynamic', 'energetic', 'fast-paced', 'engaging', 'commercial'],
    styleWeights: { 'fast-paced': 25, playful: 20, 'motion-graphics': 20 },
  },
  educational: {
    tags: ['explainer', 'tutorial', 'clear', 'informative', 'documentary'],
    styleWeights: { documentary: 25, professional: 20, 'motion-graphics': 15 },
  },
  awareness: {
    tags: ['emotional', 'storytelling', 'inspiring', 'brand', 'cinematic'],
    styleWeights: { cinematic: 25, documentary: 20, 'slow-motion': 15 },
  },
  engagement: {
    tags: ['playful', 'fun', 'dynamic', 'creative', 'social'],
    styleWeights: { playful: 30, 'fast-paced': 20, 'motion-graphics': 15 },
  },
}

/**
 * Platform-to-style mapping
 * Different platforms favor different video styles
 */
const PLATFORM_STYLE_MAP: Record<string, { tags: string[]; preferredDuration: string }> = {
  linkedin: {
    tags: ['professional', 'corporate', 'business', 'premium', 'cinematic'],
    preferredDuration: '30-60',
  },
  instagram: {
    tags: ['dynamic', 'fast-paced', 'engaging', 'colorful', 'motion-graphics'],
    preferredDuration: '15-30',
  },
  youtube: {
    tags: ['cinematic', 'documentary', 'storytelling', 'high-quality', 'detailed'],
    preferredDuration: '60-180',
  },
  tiktok: {
    tags: ['fast-paced', 'trendy', 'playful', 'energetic', 'dynamic'],
    preferredDuration: '15-30',
  },
  twitter: {
    tags: ['quick', 'punchy', 'engaging', 'attention-grabbing'],
    preferredDuration: '15-30',
  },
  web: {
    tags: ['professional', 'cinematic', 'premium', 'polished', 'brand'],
    preferredDuration: '30-90',
  },
}

/**
 * Extract style signals from AI response
 * The AI describes the recommended video direction - extract key style terms
 */
function extractStyleFromAIResponse(aiResponse: string): {
  tags: string[]
  mood: string | null
  aesthetic: string | null
} {
  const responseLower = aiResponse.toLowerCase()
  const tags: string[] = []
  let mood: string | null = null
  let aesthetic: string | null = null

  // Mood detection
  const moodPatterns: Record<string, string[]> = {
    dark: ['dark', 'moody', 'dramatic', 'intense', 'bold'],
    light: ['light', 'bright', 'airy', 'fresh', 'clean'],
    warm: ['warm', 'cozy', 'inviting', 'friendly', 'welcoming'],
    cool: ['cool', 'sleek', 'modern', 'minimal', 'sophisticated'],
    energetic: ['energetic', 'dynamic', 'vibrant', 'exciting', 'fast'],
    calm: ['calm', 'serene', 'peaceful', 'slow', 'elegant'],
  }

  for (const [moodType, keywords] of Object.entries(moodPatterns)) {
    if (keywords.some((kw) => responseLower.includes(kw))) {
      mood = moodType
      tags.push(moodType)
      break
    }
  }

  // Aesthetic detection
  const aestheticPatterns: Record<string, string[]> = {
    cinematic: ['cinematic', 'film', 'movie-like', 'theatrical', 'epic'],
    minimal: ['minimal', 'clean', 'simple', 'sleek', 'understated'],
    premium: ['premium', 'luxury', 'high-end', 'sophisticated', 'polished'],
    playful: ['playful', 'fun', 'creative', 'colorful', 'whimsical'],
    corporate: ['corporate', 'professional', 'business', 'formal'],
    tech: ['tech', 'futuristic', 'innovative', 'digital', 'modern'],
  }

  for (const [aestheticType, keywords] of Object.entries(aestheticPatterns)) {
    if (keywords.some((kw) => responseLower.includes(kw))) {
      aesthetic = aestheticType
      tags.push(aestheticType)
      break
    }
  }

  // Additional style keywords
  const styleKeywords = [
    'motion-graphics',
    'animated',
    '3d',
    'typography',
    'fast-paced',
    'slow-motion',
    'documentary',
    'product-showcase',
    'testimonial',
    'explainer',
  ]

  for (const keyword of styleKeywords) {
    if (responseLower.includes(keyword.replace('-', ' ')) || responseLower.includes(keyword)) {
      tags.push(keyword)
    }
  }

  return { tags: [...new Set(tags)], mood, aesthetic }
}

/**
 * Calculate semantic match score between video and context
 * This is the core of the improved algorithm
 */
function calculateVideoMatchScore(
  video: {
    videoTags: string[] | null
    semanticTags: string[] | null
    styleAxis: string
    subStyle: string | null
    name: string
    description: string | null
    usageCount: number | null
    featuredOrder: number | null
  },
  context: VideoMatchContext,
  aiStyleTags: string[]
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const videoTags = [...(video.videoTags || []), ...(video.semanticTags || [])].map((t) =>
    t.toLowerCase()
  )
  const videoText =
    `${video.name} ${video.description || ''} ${video.styleAxis} ${video.subStyle || ''}`.toLowerCase()

  // 1. Intent matching (0-35 points)
  if (context.intent) {
    const intentConfig = INTENT_STYLE_MAP[context.intent.toLowerCase()]
    if (intentConfig) {
      const matchingIntentTags = intentConfig.tags.filter(
        (tag) => videoTags.includes(tag) || videoText.includes(tag)
      )
      if (matchingIntentTags.length > 0) {
        score += Math.min(35, matchingIntentTags.length * 12)
        reasons.push(`Perfect for ${context.intent}`)
      }
      // Apply style weights
      for (const [style, weight] of Object.entries(intentConfig.styleWeights)) {
        if (videoTags.includes(style) || video.styleAxis.toLowerCase().includes(style)) {
          score += weight
        }
      }
    }
  }

  // 2. Platform matching (0-25 points)
  if (context.platform) {
    const platformConfig = PLATFORM_STYLE_MAP[context.platform.toLowerCase()]
    if (platformConfig) {
      const matchingPlatformTags = platformConfig.tags.filter(
        (tag) => videoTags.includes(tag) || videoText.includes(tag)
      )
      if (matchingPlatformTags.length > 0) {
        score += Math.min(25, matchingPlatformTags.length * 8)
        reasons.push(`Great for ${context.platform}`)
      }
    }
  }

  // 3. AI-recommended style matching (0-30 points) - Most important signal!
  if (aiStyleTags.length > 0) {
    const matchingAITags = aiStyleTags.filter(
      (tag) => videoTags.includes(tag) || videoText.includes(tag)
    )
    if (matchingAITags.length > 0) {
      score += Math.min(30, matchingAITags.length * 15)
      if (!reasons.length) {
        reasons.push(`Matches ${matchingAITags[0]} style`)
      }
    }
  }

  // 4. Topic/Industry matching (0-15 points)
  if (context.topic) {
    const topicLower = context.topic.toLowerCase()
    const topicWords = topicLower.split(/\s+/)
    const matchingTopicTerms = topicWords.filter(
      (word) => videoTags.includes(word) || videoText.includes(word)
    )
    if (matchingTopicTerms.length > 0) {
      score += Math.min(15, matchingTopicTerms.length * 5)
    }
    // Check for industry alignment
    const industries = ['tech', 'saas', 'ecommerce', 'lifestyle', 'finance', 'healthcare', 'food']
    for (const industry of industries) {
      if (
        topicLower.includes(industry) &&
        (videoTags.includes(industry) || videoText.includes(industry))
      ) {
        score += 10
        break
      }
    }
  }

  // 5. Quality signals (0-10 points)
  if (video.usageCount && video.usageCount > 5) {
    score += 5
  }
  if (video.featuredOrder === 0) {
    score += 5
    if (!reasons.length) {
      reasons.push('Featured style')
    }
  }

  // Default reason if none set
  if (reasons.length === 0) {
    reasons.push('Recommended style')
  }

  return { score: Math.min(100, score), reasons }
}

/**
 * Get video references for a chat context - IMPROVED ALGORITHM
 * Uses brief context, AI response analysis, and semantic matching
 */
export async function getVideoReferencesForChat(
  deliverableType: DeliverableType,
  userMessage?: string,
  limit: number = 3, // Changed default from 6 to 3
  context?: VideoMatchContext
): Promise<VideoReference[]> {
  logger.debug(
    { deliverableType, context },
    '[Video References] Getting videos with smart matching'
  )

  // Extract style signals from AI response if available
  const aiStyleAnalysis = context?.aiResponse
    ? extractStyleFromAIResponse(context.aiResponse)
    : { tags: [], mood: null, aesthetic: null }

  logger.debug({ aiStyleAnalysis }, '[Video References] AI style analysis')

  // Fetch all active video references (we'll score them ourselves)
  const allVideos = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      videoUrl: deliverableStyleReferences.videoUrl,
      videoThumbnailUrl: deliverableStyleReferences.videoThumbnailUrl,
      videoDuration: deliverableStyleReferences.videoDuration,
      videoTags: deliverableStyleReferences.videoTags,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
      usageCount: deliverableStyleReferences.usageCount,
      featuredOrder: deliverableStyleReferences.featuredOrder,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        isNotNull(deliverableStyleReferences.videoUrl),
        eq(deliverableStyleReferences.isActive, true)
      )
    )

  logger.debug({ totalVideos: allVideos.length }, '[Video References] Fetched all videos')

  if (allVideos.length === 0) {
    return []
  }

  // Score each video using the smart matching algorithm
  const scoredVideos = allVideos.map((video) => {
    const { score, reasons } = calculateVideoMatchScore(video, context || {}, aiStyleAnalysis.tags)

    return {
      ...video,
      calculatedScore: score,
      matchReasons: reasons,
    }
  })

  // Sort by score descending
  scoredVideos.sort((a, b) => b.calculatedScore - a.calculatedScore)

  // Ensure diversity: don't return 3 videos with the same styleAxis
  const selectedVideos: typeof scoredVideos = []
  const usedStyleAxes = new Set<string>()

  for (const video of scoredVideos) {
    if (selectedVideos.length >= limit) break

    // Allow max 2 videos from the same style axis for diversity
    const axisCount = selectedVideos.filter((v) => v.styleAxis === video.styleAxis).length
    if (axisCount < 2) {
      selectedVideos.push(video)
      usedStyleAxes.add(video.styleAxis)
    }
  }

  // If we don't have enough diverse videos, fill with top scores
  if (selectedVideos.length < limit) {
    for (const video of scoredVideos) {
      if (selectedVideos.length >= limit) break
      if (!selectedVideos.includes(video)) {
        selectedVideos.push(video)
      }
    }
  }

  logger.debug(
    {
      selectedCount: selectedVideos.length,
      topScores: selectedVideos
        .slice(0, 3)
        .map((v) => ({ name: v.name, score: v.calculatedScore })),
    },
    '[Video References] Final selection'
  )

  // Transform to VideoReference format
  return selectedVideos.slice(0, limit).map((video) => ({
    id: video.id,
    name: video.name,
    description: video.description,
    imageUrl: video.videoThumbnailUrl || video.imageUrl,
    videoUrl: video.videoUrl!,
    videoThumbnailUrl: video.videoThumbnailUrl,
    videoDuration: video.videoDuration,
    videoTags: video.videoTags || [],
    deliverableType: video.deliverableType,
    styleAxis: video.styleAxis,
    subStyle: video.subStyle,
    semanticTags: video.semanticTags || [],
    brandMatchScore: video.calculatedScore,
    matchReason: video.matchReasons[0],
    isVideoReference: true as const,
  }))
}

/**
 * Extract relevant video tags from user message (kept for backwards compatibility)
 */
export function extractVideoTagsFromMessage(message: string): string[] {
  const messageLower = message.toLowerCase()
  const detectedTags: string[] = []

  // Style detection
  const styleKeywords: Record<string, string[]> = {
    cinematic: ['cinematic', 'film', 'movie', 'dramatic', 'epic'],
    'motion-graphics': ['motion', 'animated', 'animation', 'graphics', 'kinetic'],
    documentary: ['documentary', 'real', 'authentic', 'story'],
    'fast-paced': ['fast', 'quick', 'dynamic', 'energetic', 'action'],
    'slow-motion': ['slow', 'smooth', 'elegant', 'calm'],
    playful: ['playful', 'fun', 'colorful', 'vibrant', 'creative'],
    professional: ['professional', 'corporate', 'business', 'formal'],
  }

  for (const [tag, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag)
    }
  }

  // Industry detection
  const industryKeywords: Record<string, string[]> = {
    tech: ['tech', 'software', 'app', 'saas', 'startup', 'digital'],
    ecommerce: ['ecommerce', 'product', 'shop', 'store', 'retail'],
    lifestyle: ['lifestyle', 'wellness', 'health', 'fitness'],
    corporate: ['corporate', 'b2b', 'enterprise', 'business'],
  }

  for (const [tag, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag)
    }
  }

  // Format detection
  const formatKeywords: Record<string, string[]> = {
    'product-showcase': ['product', 'showcase', 'demo', 'feature'],
    explainer: ['explain', 'how', 'tutorial', 'guide'],
    teaser: ['teaser', 'preview', 'coming soon', 'announcement'],
    testimonial: ['testimonial', 'review', 'customer', 'case study'],
  }

  for (const [tag, keywords] of Object.entries(formatKeywords)) {
    if (keywords.some((kw) => messageLower.includes(kw))) {
      detectedTags.push(tag)
    }
  }

  return [...new Set(detectedTags)]
}
