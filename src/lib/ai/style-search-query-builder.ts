import 'server-only'
import type { StyleContext } from '@/lib/ai/brand-style-scoring'

// =============================================================================
// DELIVERABLE TYPE LABEL MAP
// =============================================================================

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  instagram_post: 'instagram post design',
  instagram_reel: 'video ad design',
  instagram_story: 'instagram story design',
  linkedin_post: 'linkedin post design',
  static_ad: 'digital ad banner design',
  logo: 'logo design',
  brand_identity: 'brand identity design',
  presentation_slide: 'presentation slide design',
  launch_video: 'launch video design',
  landing_page: 'landing page design',
  social_content: 'social media content design',
  design_asset: 'graphic design',
  video_ad: 'video advertisement design',
}

/**
 * Build search terms from context when the AI doesn't include explicit search terms.
 * Combines deliverable type, industry, topic, and style keywords into a search query.
 */
export function buildSearchTermsFromContext(
  styleContext: StyleContext,
  deliverableType: string
): string {
  const parts: string[] = []

  // Deliverable type label
  const typeLabel = DELIVERABLE_TYPE_LABELS[deliverableType] || `${deliverableType} design`
  parts.push(typeLabel)

  // Industry context
  if (styleContext.industry) {
    parts.push(styleContext.industry)
  }

  // Topic context
  if (styleContext.topic) {
    parts.push(styleContext.topic)
  }

  // Style keywords (limit to top 3 to keep query focused)
  if (styleContext.keywords && styleContext.keywords.length > 0) {
    parts.push(...styleContext.keywords.slice(0, 3))
  }

  // Platform context
  if (styleContext.platform) {
    parts.push(styleContext.platform)
  }

  // Join and deduplicate words
  const query = parts.join(' ')
  const words = query.split(/\s+/)
  const seen = new Set<string>()
  const uniqueWords = words.filter((w) => {
    const lower = w.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })

  return uniqueWords.join(' ')
}

/**
 * Build a "different" search query by adding variety keywords
 * Used when user clicks "Show different" to get fresh results
 */
export function buildDifferentSearchTerms(baseQuery: string, excludeTerms?: string[]): string {
  const varietyKeywords = [
    'creative',
    'modern',
    'unique',
    'trendy',
    'bold',
    'artistic',
    'innovative',
    'stylish',
  ]

  // Pick a random variety keyword not in the base query
  const baseWords = new Set(baseQuery.toLowerCase().split(/\s+/))
  const excludeSet = new Set((excludeTerms || []).map((t) => t.toLowerCase()))
  const available = varietyKeywords.filter((k) => !baseWords.has(k) && !excludeSet.has(k))
  const variety = available[Math.floor(Math.random() * available.length)] || 'creative'

  return `${baseQuery} ${variety}`
}
