import { db } from '@/db'
import { deliverableStyleReferences, users } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { DeliverableType, StyleAxis } from '@/lib/constants/reference-libraries'
import { analyzeColorBucketFromHex, type ColorBucket } from '@/lib/constants/reference-libraries'
import { getHistoryBoostScores } from './selection-history'
import { extractStyleDNA, type StyleDNA } from './style-dna'
import { logger } from '@/lib/logger'

/**
 * Multi-Factor Scoring Weights
 * These control the relative importance of each scoring factor.
 * All weights should sum to 1.0
 */
const SCORING_WEIGHTS = {
  brand: 0.35, // Brand color + industry match
  history: 0.3, // User selection history
  popularity: 0.2, // Overall usage popularity
  freshness: 0.15, // Recently added bonus
}

/**
 * Fallback deliverable types for types that may not have styles in the database.
 * When a deliverable type has no styles, we fall back to a related type with available styles.
 *
 * IMPORTANT: Types NOT listed here will return empty results if no styles exist.
 * This is intentional - we don't want to show random/unrelated styles.
 */
const DELIVERABLE_TYPE_FALLBACKS: Partial<Record<DeliverableType, DeliverableType[]>> = {
  logo: ['static_ad', 'instagram_post'],
  brand_identity: ['static_ad', 'instagram_post'],
  instagram_reel: ['instagram_story', 'instagram_post'],
  youtube_thumbnail: ['static_ad', 'instagram_post'],
  video_ad: ['launch_video', 'static_ad', 'instagram_post'],
  launch_video: ['video_ad', 'instagram_reel', 'static_ad'],
  linkedin_banner: ['web_banner', 'static_ad'],
  // Note: presentation_slide intentionally has NO fallback - don't show random social media styles for presentations
}

/**
 * Style axis characteristics for brand matching
 * Maps each style to its typical color temperature, energy level, and density
 */
const STYLE_CHARACTERISTICS: Record<
  StyleAxis,
  {
    colorAffinity: ColorBucket[] // Preferred color temperatures
    energyLevel: 'calm' | 'balanced' | 'energetic'
    densityLevel: 'minimal' | 'balanced' | 'rich'
    industryAffinity: string[] // Industries that typically prefer this style
  }
> = {
  minimal: {
    colorAffinity: ['cool', 'neutral'],
    energyLevel: 'calm',
    densityLevel: 'minimal',
    industryAffinity: ['technology', 'saas', 'finance', 'consulting', 'healthcare'],
  },
  bold: {
    colorAffinity: ['warm', 'cool'], // Bold works with high contrast in any temperature
    energyLevel: 'energetic',
    densityLevel: 'rich',
    industryAffinity: ['entertainment', 'sports', 'gaming', 'food', 'retail'],
  },
  editorial: {
    colorAffinity: ['neutral', 'cool'],
    energyLevel: 'balanced',
    densityLevel: 'rich',
    industryAffinity: ['media', 'publishing', 'fashion', 'lifestyle', 'luxury'],
  },
  corporate: {
    colorAffinity: ['cool', 'neutral'],
    energyLevel: 'calm',
    densityLevel: 'balanced',
    industryAffinity: ['finance', 'legal', 'consulting', 'insurance', 'b2b', 'enterprise'],
  },
  playful: {
    colorAffinity: ['warm', 'neutral'],
    energyLevel: 'energetic',
    densityLevel: 'balanced',
    industryAffinity: ['education', 'kids', 'gaming', 'food', 'entertainment', 'consumer'],
  },
  premium: {
    colorAffinity: ['neutral', 'cool'],
    energyLevel: 'calm',
    densityLevel: 'balanced',
    industryAffinity: ['luxury', 'fashion', 'automotive', 'real estate', 'jewelry', 'hospitality'],
  },
  organic: {
    colorAffinity: ['warm', 'neutral'],
    energyLevel: 'balanced',
    densityLevel: 'balanced',
    industryAffinity: ['wellness', 'health', 'food', 'beauty', 'sustainability', 'eco'],
  },
  tech: {
    colorAffinity: ['cool', 'neutral'],
    energyLevel: 'energetic',
    densityLevel: 'minimal',
    industryAffinity: ['technology', 'saas', 'ai', 'crypto', 'fintech', 'startup'],
  },
}

/**
 * Analyze brand colors to determine overall color temperature
 */
function analyzeBrandColorTemperature(company: {
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  brandColors: string[] | null
}): { dominant: ColorBucket; distribution: Record<ColorBucket, number> } {
  const colors: string[] = []

  if (company.primaryColor) colors.push(company.primaryColor)
  if (company.secondaryColor) colors.push(company.secondaryColor)
  if (company.accentColor) colors.push(company.accentColor)
  if (company.brandColors?.length) colors.push(...company.brandColors)

  if (colors.length === 0) {
    return {
      dominant: 'neutral',
      distribution: { warm: 0, cool: 0, neutral: 1 },
    }
  }

  const bucketCounts: Record<ColorBucket, number> = {
    warm: 0,
    cool: 0,
    neutral: 0,
  }

  // Primary color has more weight
  const primaryBucket = company.primaryColor
    ? analyzeColorBucketFromHex(company.primaryColor)
    : 'neutral'
  bucketCounts[primaryBucket] += 2

  // Secondary and accent colors
  if (company.secondaryColor) {
    bucketCounts[analyzeColorBucketFromHex(company.secondaryColor)] += 1
  }
  if (company.accentColor) {
    bucketCounts[analyzeColorBucketFromHex(company.accentColor)] += 1
  }

  // Additional brand colors
  company.brandColors?.forEach((color) => {
    bucketCounts[analyzeColorBucketFromHex(color)] += 0.5
  })

  const total = bucketCounts.warm + bucketCounts.cool + bucketCounts.neutral
  const distribution: Record<ColorBucket, number> = {
    warm: bucketCounts.warm / total,
    cool: bucketCounts.cool / total,
    neutral: bucketCounts.neutral / total,
  }

  const dominant = (Object.entries(bucketCounts) as [ColorBucket, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0][0]

  return { dominant, distribution }
}

/**
 * Calculate brand match score for a style axis
 */
function calculateStyleScore(
  styleAxis: StyleAxis,
  brandColorProfile: {
    dominant: ColorBucket
    distribution: Record<ColorBucket, number>
  },
  industry: string | null
): number {
  const characteristics = STYLE_CHARACTERISTICS[styleAxis]
  let score = 0

  // Color affinity score (0-40 points)
  const colorMatch = characteristics.colorAffinity.includes(brandColorProfile.dominant)
  if (colorMatch) {
    score += 30
    // Bonus for strong color match
    const affinityScore = characteristics.colorAffinity.reduce((acc, bucket) => {
      return acc + (brandColorProfile.distribution[bucket] || 0)
    }, 0)
    score += affinityScore * 10
  } else {
    // Partial score for neutral brands (they work with most styles)
    if (brandColorProfile.dominant === 'neutral') {
      score += 20
    }
  }

  // Industry affinity score (0-30 points)
  if (industry) {
    const normalizedIndustry = industry.toLowerCase()
    const industryMatch = characteristics.industryAffinity.some(
      (ind) => normalizedIndustry.includes(ind) || ind.includes(normalizedIndustry)
    )
    if (industryMatch) {
      score += 30
    } else {
      // Partial score for related industries
      score += 10
    }
  } else {
    // No industry specified, give neutral score
    score += 15
  }

  // Base score for variety (ensure all styles get some score)
  score += 20

  return Math.min(100, score)
}

/**
 * Calculate popularity score (0-100)
 * Based on usage count relative to the most popular style
 */
function calculatePopularityScore(usageCount: number, maxUsageCount: number): number {
  if (maxUsageCount === 0) return 50

  const normalizedPopularity = usageCount / maxUsageCount
  // Use sqrt to give a boost to moderately popular items
  return Math.round(Math.sqrt(normalizedPopularity) * 100)
}

/**
 * Calculate freshness score (0-100)
 * Gives bonus to recently added styles
 */
function calculateFreshnessScore(createdAt: Date | null): number {
  if (!createdAt) return 50

  const now = new Date()
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

  // Brand new styles get 100, decays over 60 days to 50
  if (ageInDays <= 7) return 100
  if (ageInDays <= 14) return 90
  if (ageInDays <= 30) return 75
  if (ageInDays <= 60) return 60
  return 50
}

/**
 * Calculate multi-factor score with configurable weights
 */
function calculateMultiFactorScore(
  factors: {
    brand: number
    history: number
    popularity: number
    freshness: number
  },
  hasHistory: boolean
): number {
  const weights = { ...SCORING_WEIGHTS }

  // If no history, redistribute that weight
  if (!hasHistory) {
    weights.brand += weights.history * 0.5
    weights.popularity += weights.history * 0.5
    weights.history = 0
  }

  return Math.round(
    factors.brand * weights.brand +
      factors.history * weights.history +
      factors.popularity * weights.popularity +
      factors.freshness * weights.freshness
  )
}

/**
 * Get Style DNA boost for a style axis
 * Uses the pre-extracted DNA to provide additional confidence scoring
 */
function getStyleDNABoost(
  styleAxis: StyleAxis,
  styleDNA: StyleDNA | null
): { boost: number; reason: string | null } {
  if (!styleDNA) return { boost: 0, reason: null }

  const axisRecommendation = styleDNA.recommendedAxes.find((r) => r.axis === styleAxis)
  if (!axisRecommendation) return { boost: 0, reason: null }

  // Convert confidence (0-100) to boost (0-15)
  // Only apply boost if confidence is above 60
  if (axisRecommendation.confidence >= 60) {
    const boost = Math.round((axisRecommendation.confidence - 50) * 0.3)
    return {
      boost,
      reason: axisRecommendation.reason,
    }
  }

  return { boost: 0, reason: null }
}

export interface ScoreFactors {
  brand: number
  history: number
  popularity: number
  freshness: number
  dnaBoost?: number // Additional boost from Style DNA analysis
}

export interface BrandAwareStyle {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: string
  styleAxis: string
  subStyle: string | null
  semanticTags: string[]
  brandMatchScore: number
  matchReason?: string
  matchReasons?: string[] // Multiple reasons for rich tooltips
  historyBoost?: number // Bonus from user's selection history
  scoreFactors?: ScoreFactors // Breakdown of scoring factors
}

/**
 * Context for content-aware style filtering
 */
export interface StyleContext {
  topic?: string // e.g., "fitness app", "payment APIs"
  industry?: string // e.g., "technology", "health & wellness"
  keywords?: string[] // Additional keywords from the conversation
  platform?: string // e.g., "youtube", "instagram"
}

// Industry affinity mapping for style axes
// Used to boost/penalize styles based on detected industry context
const INDUSTRY_STYLE_AFFINITY: Record<string, { preferred: StyleAxis[]; avoided: StyleAxis[] }> = {
  food_beverage: {
    preferred: ['organic', 'playful', 'premium'],
    avoided: ['tech', 'corporate'],
  },
  fitness: {
    preferred: ['bold', 'playful', 'organic'],
    avoided: ['corporate', 'editorial'],
  },
  technology: {
    preferred: ['tech', 'minimal', 'corporate'],
    avoided: ['organic', 'playful'],
  },
  finance: {
    preferred: ['corporate', 'minimal', 'premium'],
    avoided: ['playful', 'organic'],
  },
  fashion: {
    preferred: ['editorial', 'premium', 'bold'],
    avoided: ['corporate', 'tech'],
  },
  beauty: {
    preferred: ['organic', 'premium', 'minimal'],
    avoided: ['tech', 'corporate'],
  },
  real_estate: {
    preferred: ['premium', 'minimal', 'corporate'],
    avoided: ['playful', 'tech'],
  },
  education: {
    preferred: ['playful', 'minimal', 'corporate'],
    avoided: ['premium', 'editorial'],
  },
  healthcare: {
    preferred: ['organic', 'minimal', 'corporate'],
    avoided: ['bold', 'playful'],
  },
  entertainment: {
    preferred: ['bold', 'playful', 'editorial'],
    avoided: ['corporate', 'minimal'],
  },
  retail: {
    preferred: ['bold', 'playful', 'premium'],
    avoided: ['corporate', 'tech'],
  },
  luxury: {
    preferred: ['premium', 'editorial', 'minimal'],
    avoided: ['playful', 'tech'],
  },
}

/**
 * Calculate context match score for a style
 */
function calculateContextScore(
  style: {
    semanticTags: string[] | null
    industries: string[] | null
    moodKeywords: string[] | null
    targetAudience: string | null
    styleAxis?: string
  },
  context: StyleContext
): number {
  if (!context.topic && !context.industry && !context.keywords?.length) {
    return 50 // Neutral score if no context
  }

  let score = 0
  let matchCount = 0
  const contextTerms: string[] = []

  // Build context terms list
  if (context.topic) {
    contextTerms.push(...context.topic.toLowerCase().split(/\s+/))
  }
  if (context.industry) {
    contextTerms.push(context.industry.toLowerCase())
  }
  if (context.keywords) {
    contextTerms.push(...context.keywords.map((k) => k.toLowerCase()))
  }

  // Check semantic tags
  const tags = (style.semanticTags || []).map((t) => t.toLowerCase())
  for (const term of contextTerms) {
    if (tags.some((tag) => tag.includes(term) || term.includes(tag))) {
      score += 20
      matchCount++
    }
  }

  // Check industries
  const industries = (style.industries || []).map((i) => i.toLowerCase())
  for (const term of contextTerms) {
    if (industries.some((ind) => ind.includes(term) || term.includes(ind))) {
      score += 25
      matchCount++
    }
  }

  // Check mood keywords
  const moods = (style.moodKeywords || []).map((m) => m.toLowerCase())
  for (const term of contextTerms) {
    if (moods.some((mood) => mood.includes(term) || term.includes(mood))) {
      score += 15
      matchCount++
    }
  }

  // Bonus for multiple matches
  if (matchCount >= 2) score += 15
  if (matchCount >= 3) score += 10

  // Industry-aware style axis scoring
  if (context.industry && style.styleAxis) {
    const industryAffinity = INDUSTRY_STYLE_AFFINITY[context.industry]
    if (industryAffinity) {
      const styleAxis = style.styleAxis as StyleAxis

      // Strong boost for preferred styles in this industry
      if (industryAffinity.preferred.includes(styleAxis)) {
        score += 35
      }

      // Penalty for styles typically avoided in this industry
      if (industryAffinity.avoided.includes(styleAxis)) {
        score -= 25
      }
    }
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Get deliverable styles scored and sorted by brand match
 */
export async function getBrandAwareStyles(
  deliverableType: DeliverableType,
  userId: string,
  options?: {
    limit?: number
    includeAllAxes?: boolean // If true, returns top style per axis
    context?: StyleContext // Optional context for content-aware filtering
  }
): Promise<BrandAwareStyle[]> {
  // Fetch user's company data
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      company: true,
    },
  })

  const company = user?.company

  // Get all active styles for this deliverable type
  const styles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
      featuredOrder: deliverableStyleReferences.featuredOrder,
      displayOrder: deliverableStyleReferences.displayOrder,
      usageCount: deliverableStyleReferences.usageCount,
      createdAt: deliverableStyleReferences.createdAt,
      // Additional fields for context matching
      industries: deliverableStyleReferences.industries,
      moodKeywords: deliverableStyleReferences.moodKeywords,
      targetAudience: deliverableStyleReferences.targetAudience,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(deliverableStyleReferences.featuredOrder, deliverableStyleReferences.displayOrder)

  // If no styles found, try fallback deliverable types
  let _actualDeliverableType = deliverableType
  let finalStyles = styles

  if (styles.length === 0) {
    const fallbacks = DELIVERABLE_TYPE_FALLBACKS[deliverableType]
    if (fallbacks) {
      for (const fallbackType of fallbacks) {
        const fallbackStyles = await db
          .select({
            id: deliverableStyleReferences.id,
            name: deliverableStyleReferences.name,
            description: deliverableStyleReferences.description,
            imageUrl: deliverableStyleReferences.imageUrl,
            deliverableType: deliverableStyleReferences.deliverableType,
            styleAxis: deliverableStyleReferences.styleAxis,
            subStyle: deliverableStyleReferences.subStyle,
            semanticTags: deliverableStyleReferences.semanticTags,
            featuredOrder: deliverableStyleReferences.featuredOrder,
            displayOrder: deliverableStyleReferences.displayOrder,
            usageCount: deliverableStyleReferences.usageCount,
            createdAt: deliverableStyleReferences.createdAt,
            industries: deliverableStyleReferences.industries,
            moodKeywords: deliverableStyleReferences.moodKeywords,
            targetAudience: deliverableStyleReferences.targetAudience,
          })
          .from(deliverableStyleReferences)
          .where(
            and(
              eq(deliverableStyleReferences.deliverableType, fallbackType),
              eq(deliverableStyleReferences.isActive, true)
            )
          )
          .orderBy(
            deliverableStyleReferences.featuredOrder,
            deliverableStyleReferences.displayOrder
          )

        if (fallbackStyles.length > 0) {
          finalStyles = fallbackStyles
          _actualDeliverableType = fallbackType
          logger.debug(
            { deliverableType, fallbackType, styleCount: fallbackStyles.length },
            '[Brand Scoring] No styles for type, using fallback'
          )
          break
        }
      }
    }
  }

  const styleContext = options?.context

  // Calculate max usage for popularity normalization
  const maxUsage = Math.max(...finalStyles.map((s) => s.usageCount || 0), 1)

  // If no company data, use popularity, freshness, and context scoring
  if (!company) {
    const neutralScored: BrandAwareStyle[] = finalStyles.map((style) => {
      const popularityScore = calculatePopularityScore(style.usageCount || 0, maxUsage)
      const freshnessScore = calculateFreshnessScore(style.createdAt)
      const contextScore = styleContext ? calculateContextScore(style, styleContext) : 50

      // Use multi-factor with context boost instead of brand
      const baseScore = calculateMultiFactorScore(
        {
          brand: contextScore,
          history: 0,
          popularity: popularityScore,
          freshness: freshnessScore,
        },
        false
      )

      // Apply context boost more aggressively when we have context
      const contextBoost =
        styleContext && contextScore > 60 ? Math.round((contextScore - 60) * 0.5) : 0
      const totalScore = Math.min(100, baseScore + contextBoost)

      const matchReasons: string[] = []
      if (contextScore >= 70) matchReasons.push('Matches your topic')
      if (popularityScore >= 70) matchReasons.push('Popular choice')
      if (freshnessScore >= 90) matchReasons.push('Recently added')

      return {
        ...style,
        semanticTags: style.semanticTags || [],
        brandMatchScore: totalScore,
        matchReason: matchReasons.length > 0 ? matchReasons[0] : 'Versatile option',
        matchReasons,
        scoreFactors: {
          brand: contextScore,
          history: 0,
          popularity: popularityScore,
          freshness: freshnessScore,
        },
      }
    })

    // Sort by score
    neutralScored.sort((a, b) => b.brandMatchScore - a.brandMatchScore)

    if (options?.includeAllAxes) {
      return getTopPerAxis(neutralScored, options.limit)
    }
    return neutralScored.slice(0, options?.limit || 8)
  }

  // Analyze brand color temperature
  const colorProfile = analyzeBrandColorTemperature({
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    accentColor: company.accentColor,
    brandColors: company.brandColors,
  })

  // Extract Style DNA for enhanced recommendations
  let styleDNA: StyleDNA | null = null
  try {
    styleDNA = await extractStyleDNA(userId)
  } catch (error) {
    logger.error({ err: error }, 'Error extracting Style DNA')
    // Continue without DNA analysis
  }

  // Get history-based boosts for personalization
  let historyBoosts = new Map<string, number>()
  try {
    historyBoosts = await getHistoryBoostScores(userId, deliverableType)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching history boosts')
    // Continue without history boosts
  }

  const hasHistory = historyBoosts.size > 0

  // Score each style using multi-factor scoring
  const scoredStyles: BrandAwareStyle[] = finalStyles.map((style) => {
    const characteristics = STYLE_CHARACTERISTICS[style.styleAxis as StyleAxis]

    // Calculate individual factor scores
    const brandScore = calculateStyleScore(
      style.styleAxis as StyleAxis,
      colorProfile,
      company.industry
    )

    // Calculate context score for topic/keyword matching
    const contextScore = styleContext ? calculateContextScore(style, styleContext) : 50

    // Convert history boost (0-30) to 0-100 scale
    const historyBoost = historyBoosts.get(style.styleAxis) || 0
    const historyScore = Math.round((historyBoost / 30) * 100)

    const popularityScore = calculatePopularityScore(style.usageCount || 0, maxUsage)
    const freshnessScore = calculateFreshnessScore(style.createdAt)

    // Get Style DNA boost for this axis
    const dnaResult = getStyleDNABoost(style.styleAxis as StyleAxis, styleDNA)

    // Blend brand score with context score
    // When context matches very well (>70), context should dominate (20/80 brand/context)
    // When context matches well (>50), context wins (30/70)
    // When context is moderate (30-50), use 50/50 split
    let effectiveBrandScore = brandScore
    if (styleContext && contextScore > 70) {
      // Very strong context match - context dominates heavily
      effectiveBrandScore = Math.round(brandScore * 0.2 + contextScore * 0.8)
    } else if (styleContext && contextScore > 50) {
      // Strong context match - context wins
      effectiveBrandScore = Math.round(brandScore * 0.3 + contextScore * 0.7)
    } else if (styleContext && contextScore > 30) {
      // Moderate context match - equal weight
      effectiveBrandScore = Math.round(brandScore * 0.5 + contextScore * 0.5)
    }

    // When we have context keywords, reduce history weight for low-context matches
    // This prevents unrelated styles from ranking high just because of past usage
    let effectiveHistoryScore = historyScore
    const hasContextKeywords = styleContext && (styleContext.keywords?.length || styleContext.topic)
    if (hasContextKeywords && contextScore < 40) {
      // Low context match with keywords present - reduce history influence significantly
      effectiveHistoryScore = Math.round(historyScore * 0.3)
    } else if (hasContextKeywords && contextScore < 60) {
      // Moderate-low context match - reduce history influence somewhat
      effectiveHistoryScore = Math.round(historyScore * 0.6)
    }

    // Calculate multi-factor total score
    const scoreFactors: ScoreFactors = {
      brand: effectiveBrandScore,
      history: effectiveHistoryScore,
      popularity: popularityScore,
      freshness: freshnessScore,
      dnaBoost: dnaResult.boost,
    }

    // Apply DNA boost and context boost to total score
    const baseScore = calculateMultiFactorScore(scoreFactors, hasHistory)

    // Strong context boost when topic matches well (can add up to +40 points)
    // This ensures topic-matching styles rank significantly higher
    let contextBoost = 0
    if (styleContext && contextScore > 70) {
      // Very strong match - large boost
      contextBoost = Math.round((contextScore - 50) * 0.8)
    } else if (styleContext && contextScore > 60) {
      // Strong match - moderate boost
      contextBoost = Math.round((contextScore - 50) * 0.5)
    }

    // Penalty for styles that clearly don't match the context
    let contextPenalty = 0
    if (hasContextKeywords && contextScore < 30) {
      // Clear mismatch - apply penalty
      contextPenalty = 15
    } else if (hasContextKeywords && contextScore < 45) {
      // Weak match - small penalty
      contextPenalty = 8
    }

    const totalScore = Math.min(
      100,
      Math.max(0, baseScore + dnaResult.boost + contextBoost - contextPenalty)
    )

    // Generate match reasons
    const matchReasons: string[] = []

    // Context-based reason (highest priority when context matches well)
    if (styleContext && contextScore >= 70) {
      matchReasons.push('Matches your topic')
    }

    // History-based reason (high priority)
    if (historyScore >= 50) {
      matchReasons.push('Based on your preferences')
    }

    // DNA-based reason
    if (dnaResult.reason && dnaResult.boost >= 5) {
      matchReasons.push(dnaResult.reason)
    }

    // Brand-based reasons
    if (characteristics && characteristics.colorAffinity.includes(colorProfile.dominant)) {
      matchReasons.push(`Matches your ${colorProfile.dominant} palette`)
    }
    if (company.industry) {
      const industryMatch = characteristics?.industryAffinity.some((ind) =>
        company.industry!.toLowerCase().includes(ind)
      )
      if (industryMatch) {
        matchReasons.push(`Popular in ${company.industry}`)
      }
    }

    // Popularity-based reason
    if (popularityScore >= 70) {
      matchReasons.push('Popular choice')
    }

    // Freshness-based reason
    if (freshnessScore >= 90) {
      matchReasons.push('Recently added')
    }

    // Determine primary match reason
    let matchReason = 'Versatile style option'
    if (matchReasons.length > 0) {
      matchReason = matchReasons[0]
    } else if (totalScore < 50) {
      matchReason = 'Alternative direction'
    }

    return {
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: totalScore,
      matchReason,
      matchReasons,
      historyBoost: historyBoost > 0 ? historyBoost : undefined,
      scoreFactors,
    }
  })

  // Sort by total score (descending)
  scoredStyles.sort((a, b) => b.brandMatchScore - a.brandMatchScore)

  if (options?.includeAllAxes) {
    return getTopPerAxis(scoredStyles, options.limit)
  }

  return scoredStyles.slice(0, options?.limit || 8)
}

/**
 * Get top scoring style per axis for variety
 */
function getTopPerAxis(styles: BrandAwareStyle[], limit?: number): BrandAwareStyle[] {
  const seenAxes = new Set<string>()
  const result: BrandAwareStyle[] = []

  // First pass: get highest scoring style per axis
  for (const style of styles) {
    if (!seenAxes.has(style.styleAxis)) {
      seenAxes.add(style.styleAxis)
      result.push(style)
    }
  }

  // Sort result by score to show best matches first
  result.sort((a, b) => b.brandMatchScore - a.brandMatchScore)

  return limit ? result.slice(0, limit) : result
}

/**
 * Get more styles of a specific axis, scored by brand match
 * Always returns styles - falls back to cycling or showing other axes
 */
export async function getBrandAwareStylesOfAxis(
  deliverableType: DeliverableType,
  styleAxis: StyleAxis,
  userId: string,
  offset: number = 0,
  limit: number = 4
): Promise<BrandAwareStyle[]> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      company: true,
    },
  })

  const company = user?.company

  // Helper to score styles
  const scoreStyles = (
    styles: typeof rawStyles,
    axis: StyleAxis,
    reason: string
  ): BrandAwareStyle[] => {
    if (company) {
      const colorProfile = analyzeBrandColorTemperature({
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        accentColor: company.accentColor,
        brandColors: company.brandColors,
      })

      return styles.map((style) => ({
        ...style,
        semanticTags: style.semanticTags || [],
        brandMatchScore: calculateStyleScore(axis, colorProfile, company.industry),
        matchReason: reason,
      }))
    }

    return styles.map((style) => ({
      ...style,
      semanticTags: style.semanticTags || [],
      brandMatchScore: 50,
      matchReason: reason,
    }))
  }

  // Try to get styles with the given offset
  let rawStyles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.styleAxis, styleAxis),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(desc(deliverableStyleReferences.usageCount), deliverableStyleReferences.displayOrder)
    .limit(limit)
    .offset(offset)

  if (rawStyles.length > 0) {
    return scoreStyles(rawStyles, styleAxis, `More ${styleAxis} options`)
  }

  // FALLBACK 1: Try from the beginning of the same axis (cycle through)
  if (offset > 0) {
    logger.debug(
      { offset, styleAxis },
      '[Brand Scoring] No more styles at offset, cycling to beginning'
    )
    rawStyles = await db
      .select({
        id: deliverableStyleReferences.id,
        name: deliverableStyleReferences.name,
        description: deliverableStyleReferences.description,
        imageUrl: deliverableStyleReferences.imageUrl,
        deliverableType: deliverableStyleReferences.deliverableType,
        styleAxis: deliverableStyleReferences.styleAxis,
        subStyle: deliverableStyleReferences.subStyle,
        semanticTags: deliverableStyleReferences.semanticTags,
      })
      .from(deliverableStyleReferences)
      .where(
        and(
          eq(deliverableStyleReferences.deliverableType, deliverableType),
          eq(deliverableStyleReferences.styleAxis, styleAxis),
          eq(deliverableStyleReferences.isActive, true)
        )
      )
      .orderBy(desc(deliverableStyleReferences.usageCount), deliverableStyleReferences.displayOrder)
      .limit(limit)

    if (rawStyles.length > 0) {
      return scoreStyles(rawStyles, styleAxis, `Top ${styleAxis} styles`)
    }
  }

  // FALLBACK 2: Try fallback deliverable types for the same axis
  const fallbacks = DELIVERABLE_TYPE_FALLBACKS[deliverableType]
  if (fallbacks) {
    for (const fallbackType of fallbacks) {
      const fallbackStyles = await db
        .select({
          id: deliverableStyleReferences.id,
          name: deliverableStyleReferences.name,
          description: deliverableStyleReferences.description,
          imageUrl: deliverableStyleReferences.imageUrl,
          deliverableType: deliverableStyleReferences.deliverableType,
          styleAxis: deliverableStyleReferences.styleAxis,
          subStyle: deliverableStyleReferences.subStyle,
          semanticTags: deliverableStyleReferences.semanticTags,
        })
        .from(deliverableStyleReferences)
        .where(
          and(
            eq(deliverableStyleReferences.deliverableType, fallbackType),
            eq(deliverableStyleReferences.styleAxis, styleAxis),
            eq(deliverableStyleReferences.isActive, true)
          )
        )
        .orderBy(
          desc(deliverableStyleReferences.usageCount),
          deliverableStyleReferences.displayOrder
        )
        .limit(limit)

      if (fallbackStyles.length > 0) {
        logger.debug({ fallbackType, styleAxis }, '[Brand Scoring] Using fallback for styles')
        return scoreStyles(fallbackStyles, styleAxis, `Similar ${styleAxis} styles`)
      }
    }
  }

  // FALLBACK 3: Get top styles from ANY axis for this deliverable type (same type, different axis)
  // This is acceptable because it's still the correct content type
  logger.debug(
    { styleAxis },
    '[Brand Scoring] No styles found for axis, checking other axes of same type'
  )
  const anyAxisStyles = await db
    .select({
      id: deliverableStyleReferences.id,
      name: deliverableStyleReferences.name,
      description: deliverableStyleReferences.description,
      imageUrl: deliverableStyleReferences.imageUrl,
      deliverableType: deliverableStyleReferences.deliverableType,
      styleAxis: deliverableStyleReferences.styleAxis,
      subStyle: deliverableStyleReferences.subStyle,
      semanticTags: deliverableStyleReferences.semanticTags,
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )
    .orderBy(desc(deliverableStyleReferences.usageCount), deliverableStyleReferences.displayOrder)
    .limit(limit)

  if (anyAxisStyles.length > 0) {
    return scoreStyles(
      anyAxisStyles,
      anyAxisStyles[0].styleAxis as StyleAxis,
      'Top recommended styles'
    )
  }

  // FALLBACK 4: Only use styles from fallback types if we have explicit fallbacks configured
  // This prevents showing random/unrelated styles for types like presentation_slide
  if (fallbacks && fallbacks.length > 0) {
    for (const fallbackType of fallbacks) {
      const anyFallbackStyles = await db
        .select({
          id: deliverableStyleReferences.id,
          name: deliverableStyleReferences.name,
          description: deliverableStyleReferences.description,
          imageUrl: deliverableStyleReferences.imageUrl,
          deliverableType: deliverableStyleReferences.deliverableType,
          styleAxis: deliverableStyleReferences.styleAxis,
          subStyle: deliverableStyleReferences.subStyle,
          semanticTags: deliverableStyleReferences.semanticTags,
        })
        .from(deliverableStyleReferences)
        .where(
          and(
            eq(deliverableStyleReferences.deliverableType, fallbackType),
            eq(deliverableStyleReferences.isActive, true)
          )
        )
        .orderBy(
          desc(deliverableStyleReferences.usageCount),
          deliverableStyleReferences.displayOrder
        )
        .limit(limit)

      if (anyFallbackStyles.length > 0) {
        logger.debug({ fallbackType }, '[Brand Scoring] Using styles from explicit fallback type')
        return scoreStyles(
          anyFallbackStyles,
          anyFallbackStyles[0].styleAxis as StyleAxis,
          'Recommended styles'
        )
      }
    }
  }

  // No styles found and no fallbacks configured - return empty
  // This is intentional - we don't want to show random/unrelated styles
  logger.debug(
    { deliverableType, styleAxis },
    '[Brand Scoring] No styles found and no fallbacks - returning empty'
  )
  return []
}
