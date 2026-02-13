import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import type { DeliverableType } from '@/lib/constants/reference-libraries'
import { logger } from '@/lib/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Common style-related keywords and their synonyms/related terms
 * Used for expanding search queries
 */
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  // Temperature
  warm: ['warm', 'cozy', 'inviting', 'friendly', 'approachable', 'earthy'],
  cool: ['cool', 'cold', 'professional', 'corporate', 'sleek', 'modern'],
  neutral: ['neutral', 'balanced', 'versatile', 'clean'],

  // Energy
  calm: ['calm', 'peaceful', 'serene', 'zen', 'minimal', 'quiet', 'subtle'],
  energetic: ['energetic', 'dynamic', 'bold', 'vibrant', 'active', 'exciting'],

  // Style descriptors
  minimal: ['minimal', 'minimalist', 'clean', 'simple', 'whitespace', 'sparse'],
  bold: ['bold', 'strong', 'impactful', 'striking', 'attention-grabbing'],
  playful: ['playful', 'fun', 'colorful', 'creative', 'whimsical', 'cheerful'],
  premium: ['premium', 'luxury', 'elegant', 'sophisticated', 'high-end', 'refined'],
  corporate: ['corporate', 'professional', 'business', 'formal', 'trustworthy', 'b2b'],
  editorial: ['editorial', 'magazine', 'content-rich', 'layout', 'typographic'],
  organic: ['organic', 'natural', 'earthy', 'sustainable', 'eco', 'wellness'],
  tech: ['tech', 'digital', 'modern', 'futuristic', 'startup', 'innovative'],

  // Industry
  fintech: ['fintech', 'finance', 'banking', 'payment', 'financial'],
  healthcare: ['healthcare', 'medical', 'health', 'wellness', 'clinical'],
  ecommerce: ['ecommerce', 'retail', 'shopping', 'consumer', 'product'],
  saas: ['saas', 'software', 'cloud', 'platform', 'enterprise'],
  fashion: ['fashion', 'style', 'clothing', 'beauty', 'lifestyle'],
  food: ['food', 'restaurant', 'culinary', 'dining', 'beverage'],
}

/**
 * Extract keywords from a text query
 */
function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase()
  const words = normalizedText.split(/\s+/)
  const keywords: Set<string> = new Set()

  // Direct word matches
  words.forEach((word) => {
    // Clean punctuation
    const cleanWord = word.replace(/[^\w]/g, '')
    if (cleanWord.length > 2) {
      keywords.add(cleanWord)
    }
  })

  // Check for synonym matches and expand
  Object.entries(KEYWORD_SYNONYMS).forEach(([key, synonyms]) => {
    if (synonyms.some((syn) => normalizedText.includes(syn))) {
      keywords.add(key)
      // Add a few related synonyms for broader matching
      synonyms.slice(0, 3).forEach((syn) => keywords.add(syn))
    }
  })

  return Array.from(keywords)
}

/**
 * Calculate semantic similarity score between query keywords and style tags
 */
function calculateSemanticScore(
  queryKeywords: string[],
  styleTags: string[],
  styleDescription: string | null
): number {
  if (queryKeywords.length === 0) return 0

  const normalizedTags = styleTags.map((t) => t.toLowerCase())
  const normalizedDesc = (styleDescription || '').toLowerCase()

  let matchCount = 0
  let partialMatchCount = 0

  queryKeywords.forEach((keyword) => {
    // Exact tag match
    if (normalizedTags.includes(keyword)) {
      matchCount += 2
    }
    // Partial tag match (keyword is part of a tag or vice versa)
    else if (normalizedTags.some((tag) => tag.includes(keyword) || keyword.includes(tag))) {
      partialMatchCount += 1
    }
    // Description match
    else if (normalizedDesc.includes(keyword)) {
      partialMatchCount += 0.5
    }
    // Synonym expansion match
    else {
      const relatedTerms = Object.entries(KEYWORD_SYNONYMS).find(([_, synonyms]) =>
        synonyms.includes(keyword)
      )
      if (relatedTerms) {
        const [rootKey, synonyms] = relatedTerms
        if (
          normalizedTags.includes(rootKey) ||
          normalizedTags.some((tag) => synonyms.includes(tag))
        ) {
          partialMatchCount += 0.75
        }
      }
    }
  })

  // Calculate score (0-100)
  const maxPossibleScore = queryKeywords.length * 2
  const rawScore = matchCount + partialMatchCount
  const normalizedScore = Math.min(100, (rawScore / maxPossibleScore) * 100)

  return Math.round(normalizedScore)
}

export interface SemanticStyleResult {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: string
  styleAxis: string
  subStyle: string | null
  semanticTags: string[]
  semanticScore: number
  matchedKeywords: string[]
}

/**
 * Search for styles that semantically match a query
 */
export async function searchStylesByQuery(
  query: string,
  deliverableType?: DeliverableType,
  limit: number = 8
): Promise<SemanticStyleResult[]> {
  // Extract keywords from query
  const queryKeywords = extractKeywords(query)

  if (queryKeywords.length === 0) {
    return []
  }

  // Build query conditions
  const conditions = [eq(deliverableStyleReferences.isActive, true)]
  if (deliverableType) {
    conditions.push(eq(deliverableStyleReferences.deliverableType, deliverableType))
  }

  // Fetch all active styles (for small datasets, this is efficient enough)
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
    })
    .from(deliverableStyleReferences)
    .where(and(...conditions))

  // Score each style
  const scoredStyles: SemanticStyleResult[] = styles.map((style) => {
    const tags = style.semanticTags || []
    const score = calculateSemanticScore(queryKeywords, tags, style.description)

    // Find which keywords matched
    const matchedKeywords = queryKeywords.filter((keyword) => {
      const normalizedTags = tags.map((t) => t.toLowerCase())
      const normalizedDesc = (style.description || '').toLowerCase()
      return (
        normalizedTags.some((tag) => tag.includes(keyword) || keyword.includes(tag)) ||
        normalizedDesc.includes(keyword)
      )
    })

    return {
      ...style,
      semanticTags: tags,
      semanticScore: score,
      matchedKeywords,
    }
  })

  // Sort by semantic score and return top results
  scoredStyles.sort((a, b) => b.semanticScore - a.semanticScore)

  return scoredStyles.filter((s) => s.semanticScore > 0).slice(0, limit)
}

/**
 * AI-enhanced semantic search for complex queries
 * Uses Claude to understand nuanced requests and rank styles
 */
export async function aiEnhancedStyleSearch(
  conversationContext: string,
  deliverableType: DeliverableType,
  limit: number = 6
): Promise<SemanticStyleResult[]> {
  // First, get all styles for this deliverable type
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
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )

  if (styles.length === 0) {
    return []
  }

  // Prepare style summaries for Claude
  const styleSummaries = styles.map((s, i) => ({
    index: i,
    name: s.name,
    axis: s.styleAxis,
    tags: (s.semanticTags || []).join(', '),
    description: s.description,
  }))

  // Ask Claude to rank the styles based on context
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `You are a design style matcher. Given a conversation context and a list of available styles, rank the most relevant styles for the user's needs. Return only a JSON array of style indices in order of relevance.`,
    messages: [
      {
        role: 'user',
        content: `Context from conversation:
"${conversationContext}"

Available styles:
${styleSummaries.map((s) => `${s.index}: ${s.name} (${s.axis}) - ${s.tags}`).join('\n')}

Return the indices of the ${Math.min(limit, styles.length)} most relevant styles as a JSON array, e.g. [2, 0, 5, 1].
Only return the JSON array, nothing else.`,
      },
    ],
  })

  // Parse the response
  const content = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\d,\s]+\]/)
    if (!jsonMatch) {
      // Fallback to keyword-based search
      return searchStylesByQuery(conversationContext, deliverableType, limit)
    }

    const rankedIndices: number[] = JSON.parse(jsonMatch[0])

    // Build results in ranked order
    const results: SemanticStyleResult[] = []
    rankedIndices.forEach((index, rank) => {
      if (index >= 0 && index < styles.length) {
        const style = styles[index]
        results.push({
          ...style,
          semanticTags: style.semanticTags || [],
          semanticScore: 100 - rank * 10, // Higher rank = higher score
          matchedKeywords: [], // AI-based matching doesn't track specific keywords
        })
      }
    })

    return results.slice(0, limit)
  } catch (error) {
    logger.error({ err: error }, 'Error parsing AI style ranking')
    // Fallback to keyword-based search
    return searchStylesByQuery(conversationContext, deliverableType, limit)
  }
}

/**
 * Detect if a message contains style preference expressions
 * Returns extracted preferences if found
 */
export function detectStylePreferences(message: string): {
  hasPreferences: boolean
  preferences: string[]
} {
  const styleIndicators = [
    /something\s+(more\s+)?(\w+)/i,
    /less\s+(\w+)/i,
    /like\s+(\w+)/i,
    /prefer\s+(\w+)/i,
    /want\s+(it\s+)?(more\s+)?(\w+)/i,
    /should\s+be\s+(\w+)/i,
    /looking\s+for\s+(\w+)/i,
    /needs?\s+to\s+be\s+(\w+)/i,
  ]

  const preferences: string[] = []

  styleIndicators.forEach((pattern) => {
    const match = message.match(pattern)
    if (match) {
      // Get the captured style word (last capture group)
      const styleWord = match[match.length - 1]
      if (styleWord && styleWord.length > 2) {
        preferences.push(styleWord.toLowerCase())
      }
    }
  })

  // Also check for explicit style axis mentions
  const styleAxes = [
    'minimal',
    'bold',
    'editorial',
    'corporate',
    'playful',
    'premium',
    'organic',
    'tech',
  ]
  const messageLower = message.toLowerCase()
  styleAxes.forEach((axis) => {
    if (messageLower.includes(axis) && !preferences.includes(axis)) {
      preferences.push(axis)
    }
  })

  return {
    hasPreferences: preferences.length > 0,
    preferences: [...new Set(preferences)],
  }
}

/**
 * Refinement modifiers and their effect on style characteristics
 */
const REFINEMENT_MODIFIERS: Record<
  string,
  {
    boost: string[] // Tags to boost in scoring
    suppress: string[] // Tags to suppress in scoring
    axisShift?: string // Suggest shifting to a different axis
  }
> = {
  cleaner: {
    boost: ['clean', 'minimal', 'simple', 'whitespace'],
    suppress: ['busy', 'complex', 'rich'],
  },
  simpler: { boost: ['minimal', 'simple', 'clean'], suppress: ['complex', 'detailed', 'rich'] },
  bolder: {
    boost: ['bold', 'strong', 'impactful', 'contrast'],
    suppress: ['subtle', 'minimal', 'soft'],
  },
  darker: {
    boost: ['dark', 'moody', 'dramatic', 'contrast'],
    suppress: ['light', 'bright', 'airy'],
  },
  lighter: { boost: ['light', 'bright', 'airy', 'soft'], suppress: ['dark', 'moody', 'dramatic'] },
  warmer: {
    boost: ['warm', 'cozy', 'friendly', 'earthy'],
    suppress: ['cool', 'cold', 'corporate'],
  },
  cooler: {
    boost: ['cool', 'modern', 'sleek', 'professional'],
    suppress: ['warm', 'cozy', 'earthy'],
  },
  'more professional': {
    boost: ['professional', 'corporate', 'business', 'trustworthy'],
    suppress: ['playful', 'casual', 'fun'],
  },
  'more playful': {
    boost: ['playful', 'fun', 'creative', 'colorful'],
    suppress: ['corporate', 'serious', 'formal'],
  },
  'more premium': {
    boost: ['premium', 'luxury', 'elegant', 'sophisticated'],
    suppress: ['casual', 'playful', 'simple'],
  },
  'more modern': {
    boost: ['modern', 'contemporary', 'sleek', 'digital'],
    suppress: ['traditional', 'classic', 'vintage'],
  },
  'more minimal': {
    boost: ['minimal', 'clean', 'simple', 'whitespace'],
    suppress: ['busy', 'complex', 'detailed'],
    axisShift: 'minimal',
  },
  'more organic': {
    boost: ['organic', 'natural', 'earthy', 'wellness'],
    suppress: ['digital', 'tech', 'corporate'],
    axisShift: 'organic',
  },
  'more tech': {
    boost: ['tech', 'digital', 'futuristic', 'modern'],
    suppress: ['traditional', 'organic', 'earthy'],
    axisShift: 'tech',
  },
}

/**
 * Detect refinement intent from user message
 * Returns the base style they're referring to and the refinement direction
 */
export function detectStyleRefinement(message: string): {
  isRefinement: boolean
  refinementType?: string
  baseStyleReference?: 'this' | 'selected' | 'previous'
} {
  const messageLower = message.toLowerCase()

  // Patterns that indicate refinement of a previous/selected style
  const refinementPatterns = [
    /more\s+like\s+(this|that)\s+but\s+(\w+)/i,
    /similar\s+(to\s+)?(this|that)\s+but\s+(\w+)/i,
    /like\s+(this|the selected one)\s+but\s+(\w+)/i,
    /(this|that)\s+but\s+(more\s+)?(\w+)/i,
    /same\s+style\s+but\s+(\w+)/i,
    /keep\s+(this|the)\s+(\w+)\s+but\s+make\s+it\s+(\w+)/i,
    /can\s+you\s+make\s+(it|this)\s+(more\s+)?(\w+)/i,
  ]

  for (const pattern of refinementPatterns) {
    const match = messageLower.match(pattern)
    if (match) {
      // Find the refinement word (usually the last capture group)
      const refinementWord = match[match.length - 1]

      // Determine what style they're referring to
      let baseRef: 'this' | 'selected' | 'previous' = 'this'
      if (messageLower.includes('selected') || messageLower.includes('chosen')) {
        baseRef = 'selected'
      } else if (messageLower.includes('previous') || messageLower.includes('last')) {
        baseRef = 'previous'
      }

      return {
        isRefinement: true,
        refinementType: refinementWord,
        baseStyleReference: baseRef,
      }
    }
  }

  // Check for standalone refinement modifiers with context
  for (const modifier of Object.keys(REFINEMENT_MODIFIERS)) {
    if (messageLower.includes(modifier)) {
      return {
        isRefinement: true,
        refinementType: modifier,
        baseStyleReference: 'this',
      }
    }
  }

  return { isRefinement: false }
}

export interface StyleRefinementResult extends SemanticStyleResult {
  refinementMatch: number // Score for how well it matches the refinement
  baseStyleSimilarity: number // Score for similarity to base style
}

/**
 * Refine style search based on a base style and user feedback
 * Combines the base style's characteristics with refinement modifiers
 */
export async function refineStyleSearch(
  baseStyle: {
    id: string
    name: string
    styleAxis: string
    semanticTags: string[]
    description: string | null
  },
  refinementQuery: string,
  deliverableType: DeliverableType,
  limit: number = 6
): Promise<StyleRefinementResult[]> {
  // Extract refinement modifiers from query
  const queryLower = refinementQuery.toLowerCase()
  const boostTags: string[] = []
  const suppressTags: string[] = []
  let preferredAxis: string | undefined

  // Check for known refinement modifiers
  for (const [modifier, effects] of Object.entries(REFINEMENT_MODIFIERS)) {
    if (queryLower.includes(modifier)) {
      boostTags.push(...effects.boost)
      suppressTags.push(...effects.suppress)
      if (effects.axisShift) {
        preferredAxis = effects.axisShift
      }
    }
  }

  // Also extract any additional keywords from the query
  const additionalKeywords = extractKeywords(refinementQuery)
  boostTags.push(...additionalKeywords)

  // Combine base style tags with boost tags (removing suppressed ones)
  const combinedTags = [
    ...baseStyle.semanticTags.filter((tag) => !suppressTags.includes(tag.toLowerCase())),
    ...boostTags,
  ]

  // Fetch all styles for this deliverable type
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
    })
    .from(deliverableStyleReferences)
    .where(
      and(
        eq(deliverableStyleReferences.deliverableType, deliverableType),
        eq(deliverableStyleReferences.isActive, true)
      )
    )

  // Score each style based on:
  // 1. Similarity to base style
  // 2. Match to refinement modifiers
  const scoredStyles: StyleRefinementResult[] = styles
    .filter((style) => style.id !== baseStyle.id) // Exclude the base style itself
    .map((style) => {
      const tags = style.semanticTags || []
      const normalizedTags = tags.map((t) => t.toLowerCase())

      // Calculate base style similarity (how similar to the original selection)
      const baseTagMatch = baseStyle.semanticTags.filter((bt) =>
        normalizedTags.some((t) => t.includes(bt.toLowerCase()) || bt.toLowerCase().includes(t))
      ).length
      const baseSimilarity = Math.round(
        (baseTagMatch / Math.max(baseStyle.semanticTags.length, 1)) * 100
      )

      // Calculate refinement match (how well it matches the refinement direction)
      let refinementScore = 0
      let boostMatches = 0
      let suppressMatches = 0

      boostTags.forEach((boost) => {
        if (normalizedTags.some((t) => t.includes(boost) || boost.includes(t))) {
          boostMatches++
        }
      })

      suppressTags.forEach((suppress) => {
        if (normalizedTags.some((t) => t.includes(suppress) || suppress.includes(t))) {
          suppressMatches++
        }
      })

      refinementScore =
        boostTags.length > 0
          ? Math.round(((boostMatches - suppressMatches * 0.5) / boostTags.length) * 100)
          : 50
      refinementScore = Math.max(0, Math.min(100, refinementScore))

      // Bonus for matching preferred axis
      if (preferredAxis && style.styleAxis === preferredAxis) {
        refinementScore += 20
      }

      // Also bonus for same axis as base (similarity)
      if (style.styleAxis === baseStyle.styleAxis && !preferredAxis) {
        refinementScore += 10
      }

      // Calculate combined semantic score
      const combinedScore = calculateSemanticScore(combinedTags, tags, style.description)

      // Final score is weighted combination
      const semanticScore = Math.round(
        combinedScore * 0.4 + refinementScore * 0.4 + baseSimilarity * 0.2
      )

      // Determine matched keywords for display
      const matchedKeywords = boostTags.filter((boost) =>
        normalizedTags.some((t) => t.includes(boost) || boost.includes(t))
      )

      return {
        ...style,
        semanticTags: tags,
        semanticScore,
        refinementMatch: refinementScore,
        baseStyleSimilarity: baseSimilarity,
        matchedKeywords,
      }
    })

  // Sort by semantic score (which now includes refinement matching)
  scoredStyles.sort((a, b) => b.semanticScore - a.semanticScore)

  return scoredStyles.slice(0, limit)
}
