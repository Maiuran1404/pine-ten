/**
 * Enhanced Extractors for Briefing State Machine
 *
 * Extracts style keywords, inspiration references, audience signals,
 * industry signals, and resolves deliverable categories from messages
 * and inference results.
 *
 * All functions are pure — no side effects, no API calls.
 */

import type { InferenceResult } from '@/components/chat/brief-panel/types'
import type { DeliverableCategory, StructureData } from './briefing-state-machine'

// =============================================================================
// AUDIENCE SIGNAL TYPE
// =============================================================================

export interface AudienceSignal {
  label: string
  segment: 'enterprise' | 'consumer' | 'startup' | 'professional' | 'student'
  confidence: number
}

// =============================================================================
// STYLE KEYWORD EXTRACTION
// =============================================================================

const STYLE_KEYWORD_PATTERNS: Array<{ pattern: RegExp; keyword: string }> = [
  { pattern: /\b(light|airy|soft|ethereal)\b/i, keyword: 'light' },
  { pattern: /\b(dark|moody|noir)\b/i, keyword: 'dark' },
  { pattern: /\b(bold|strong|powerful|striking)\b/i, keyword: 'bold' },
  { pattern: /\b(minimal|minimalist|clean|simple)\b/i, keyword: 'minimal' },
  { pattern: /\b(cinematic|filmic|movie)\b/i, keyword: 'cinematic' },
  { pattern: /\b(playful|fun|whimsical|quirky)\b/i, keyword: 'playful' },
  { pattern: /\b(premium|luxury|luxurious|high-end)\b/i, keyword: 'premium' },
  { pattern: /\b(organic|natural|earthy)\b/i, keyword: 'organic' },
  { pattern: /\b(modern|contemporary|sleek)\b/i, keyword: 'modern' },
  { pattern: /\b(retro|vintage|nostalgic|classic)\b/i, keyword: 'retro' },
  { pattern: /\b(brutalist|raw|industrial|grunge)\b/i, keyword: 'brutalist' },
  { pattern: /\b(editorial|magazine|editorial-style)\b/i, keyword: 'editorial' },
  { pattern: /\b(corporate|professional|business)\b/i, keyword: 'corporate' },
  { pattern: /\b(techy?|futuristic|digital|cyber)\b/i, keyword: 'tech' },
  { pattern: /\b(warm|cozy|inviting)\b/i, keyword: 'warm' },
  { pattern: /\b(cool|icy|frosty|cold)\b/i, keyword: 'cool' },
  { pattern: /\b(edgy|sharp|aggressive)\b/i, keyword: 'edgy' },
  { pattern: /\b(elegant|graceful|refined|sophisticated)\b/i, keyword: 'elegant' },
  { pattern: /\b(vibrant|colorful|vivid|saturated)\b/i, keyword: 'vibrant' },
  { pattern: /\b(muted|desaturated|subdued|toned-down)\b/i, keyword: 'muted' },
  { pattern: /\b(geometric|structured|grid)\b/i, keyword: 'geometric' },
  { pattern: /\b(lo-fi|lofi|raw|unfiltered|authentic)\b/i, keyword: 'lo-fi' },
]

/**
 * Extract style keywords from a message.
 * Returns deduplicated list of matched keywords.
 */
export function extractStyleKeywords(message: string): string[] {
  const keywords = new Set<string>()
  for (const { pattern, keyword } of STYLE_KEYWORD_PATTERNS) {
    if (pattern.test(message)) {
      keywords.add(keyword)
    }
  }
  return Array.from(keywords)
}

// =============================================================================
// INSPIRATION REFERENCE EXTRACTION
// =============================================================================

/**
 * Extract inspiration references from a message.
 * Detects: "similar to X", "@handle", URLs, quoted names, known brands.
 */
export function extractInspirationReferences(message: string): string[] {
  const refs = new Set<string>()

  // "similar to X" / "like X" / "X style" / "inspired by X"
  const similarPatterns = [
    /(?:similar to|like|inspired by|think|style of|reference)\s+["']?([A-Z][\w\s&.'-]+?)["']?(?:\s*(?:style|aesthetic|vibe|look|energy|direction|brand)?)?(?:\s*[,.\-]|\s+(?:but|and|with|for|on)|$)/gi,
    /["']([A-Z][\w\s&.'-]+?)["']\s*(?:style|aesthetic|vibe|look|energy)/gi,
  ]

  for (const pattern of similarPatterns) {
    let match
    while ((match = pattern.exec(message)) !== null) {
      const ref = match[1].trim()
      if (ref.length >= 2 && ref.length <= 40 && !isCommonWord(ref)) {
        refs.add(ref)
      }
    }
  }

  // @handle references
  const handlePattern = /@([\w.]+)/g
  let handleMatch
  while ((handleMatch = handlePattern.exec(message)) !== null) {
    refs.add(`@${handleMatch[1]}`)
  }

  // URL references
  const urlPattern = /https?:\/\/[^\s,)]+/gi
  let urlMatch
  while ((urlMatch = urlPattern.exec(message)) !== null) {
    refs.add(urlMatch[0])
  }

  // Known brand detection (case insensitive, whole word)
  const knownBrands = [
    'Stripe',
    'Linear',
    'Vercel',
    'Notion',
    'Figma',
    'Gymshark',
    'Nike',
    'Apple',
    'Patagonia',
    'Everlane',
    'Allbirds',
    'Tesla',
    'Airbnb',
    'Spotify',
    'Netflix',
    'Glossier',
    'Aesop',
  ]

  for (const brand of knownBrands) {
    if (new RegExp(`\\b${brand}\\b`, 'i').test(message)) {
      refs.add(brand)
    }
  }

  return Array.from(refs)
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'for',
    'with',
    'that',
    'this',
    'from',
    'they',
    'we',
    'our',
    'my',
    'your',
    'it',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'I',
    'Video',
    'Social',
    'Content',
    'Website',
    'Design',
    'Post',
    'Something',
  ])
  return common.has(word) || common.has(word.toLowerCase())
}

// =============================================================================
// DELIVERABLE CATEGORY RESOLUTION
// =============================================================================

/**
 * Map an InferenceResult to a DeliverableCategory.
 * Uses taskType, contentType, and platform to determine category.
 */
export function resolveDeliverableCategory(inference: InferenceResult): DeliverableCategory {
  const taskType = inference.taskType.value
  const contentType = inference.contentType.value
  const platform = inference.platform.value

  // Video detection — explicit content type
  if (contentType === 'video' || contentType === 'reel') {
    return 'video'
  }

  // Video-first platforms: TikTok, YouTube always produce video content
  if (platform === 'tiktok' || platform === 'youtube') {
    return 'video'
  }

  // Video detection — check raw topic text for video keywords when contentType is ambiguous
  // This catches "brand story video" where contentType might resolve to 'story' instead of 'video'
  const topic = inference.topic?.value ?? ''
  if (topic && /\b(video|motion|animation|cinematic|footage)\b/i.test(topic)) {
    return 'video'
  }

  // Website detection
  if (platform === 'web' || platform === 'email') {
    if (taskType === 'single_asset' && contentType !== 'banner' && contentType !== 'ad') {
      return 'website'
    }
  }

  // Content calendar detection
  if (taskType === 'multi_asset_plan') {
    return 'content'
  }

  // Brand detection via presentation (pitch deck, brand package)
  if (platform === 'presentation' || contentType === 'slide') {
    return 'design' // pitch decks are design category
  }

  // Single design asset
  if (taskType === 'single_asset') {
    if (contentType === 'poster' || contentType === 'flyer' || contentType === 'banner') {
      return 'design'
    }
    return 'design'
  }

  // Campaign
  if (taskType === 'campaign') {
    return 'content'
  }

  return 'unknown'
}

/**
 * Map a DeliverableCategory to the corresponding StructureData type.
 */
export function resolveStructureType(category: DeliverableCategory): StructureData['type'] | null {
  switch (category) {
    case 'video':
      return 'storyboard'
    case 'website':
      return 'layout'
    case 'content':
      return 'calendar'
    case 'design':
    case 'brand':
      return 'single_design'
    default:
      return null
  }
}

// =============================================================================
// AUDIENCE SIGNAL EXTRACTION
// =============================================================================

const AUDIENCE_PATTERNS: Array<{
  pattern: RegExp
  label: string
  segment: AudienceSignal['segment']
  confidence: number
}> = [
  {
    pattern: /\b(ctos?|c-suite|vp\s+engineering|head of engineering)\b/i,
    label: 'CTO / Technical Leadership',
    segment: 'enterprise',
    confidence: 0.9,
  },
  {
    pattern: /\b(ceos?|executives?|c-level)\b/i,
    label: 'CEO / Executive',
    segment: 'enterprise',
    confidence: 0.9,
  },
  {
    pattern: /\b(enterprise|large\s+companies?|fortune\s+500)\b/i,
    label: 'Enterprise',
    segment: 'enterprise',
    confidence: 0.85,
  },
  {
    pattern: /\b(b2b|business\s+to\s+business)\b/i,
    label: 'B2B',
    segment: 'enterprise',
    confidence: 0.8,
  },
  {
    pattern: /\b(investors?|vcs?|venture\s+capital)\b/i,
    label: 'Investors',
    segment: 'startup',
    confidence: 0.9,
  },
  {
    pattern: /\b(founders?|startups?|early[\s-]stage)\b/i,
    label: 'Startup Founders',
    segment: 'startup',
    confidence: 0.85,
  },
  {
    pattern: /\b(developers?|engineers?|programmers?|devs)\b/i,
    label: 'Developers',
    segment: 'professional',
    confidence: 0.85,
  },
  {
    pattern: /\b(marketers?|marketing\s+(team|professionals?))\b/i,
    label: 'Marketing Professionals',
    segment: 'professional',
    confidence: 0.8,
  },
  {
    pattern: /\b(gen\s*z|gen[\s-]z|generation\s+z)\b/i,
    label: 'Gen Z',
    segment: 'consumer',
    confidence: 0.9,
  },
  {
    pattern: /\b(millennials?|gen\s*y)\b/i,
    label: 'Millennials',
    segment: 'consumer',
    confidence: 0.85,
  },
  {
    pattern: /\b(consumers?|dtc|direct\s+to\s+consumer)\b/i,
    label: 'Consumer',
    segment: 'consumer',
    confidence: 0.75,
  },
  {
    pattern: /\b(students?|college|university)\b/i,
    label: 'Students',
    segment: 'student',
    confidence: 0.85,
  },
  {
    pattern: /\b(hr\s+directors?|human\s+resources?)\b/i,
    label: 'HR Directors',
    segment: 'enterprise',
    confidence: 0.85,
  },
]

/**
 * Extract audience signals from a message.
 * Returns all matched signals sorted by confidence (highest first).
 */
export function extractAudienceSignals(message: string): AudienceSignal[] {
  const signals: AudienceSignal[] = []
  for (const { pattern, label, segment, confidence } of AUDIENCE_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({ label, segment, confidence })
    }
  }
  return signals.sort((a, b) => b.confidence - a.confidence)
}

// =============================================================================
// INDUSTRY SIGNAL EXTRACTION
// =============================================================================

const INDUSTRY_PATTERNS: Array<{ pattern: RegExp; industry: string }> = [
  { pattern: /\b(saas|software[\s-]as[\s-]a[\s-]service)\b/i, industry: 'SaaS' },
  { pattern: /\b(b2b)\b/i, industry: 'B2B' },
  { pattern: /\b(fintech|financial\s+tech)\b/i, industry: 'fintech' },
  { pattern: /\b(banking|bank)\b/i, industry: 'banking' },
  { pattern: /\b(fashion|clothing|apparel|garment)\b/i, industry: 'fashion' },
  {
    pattern: /\b(sustainab\w+|eco[\s-]friendly|green|ethical)\b/i,
    industry: 'sustainable',
  },
  { pattern: /\b(wellness|well[\s-]being|mindfulness)\b/i, industry: 'wellness' },
  { pattern: /\b(health|healthcare|medical)\b/i, industry: 'health' },
  { pattern: /\b(fitness|gym|workout|exercise)\b/i, industry: 'fitness' },
  { pattern: /\b(beauty|skincare|cosmetics?)\b/i, industry: 'beauty' },
  { pattern: /\b(yoga|meditation|pilates)\b/i, industry: 'yoga' },
  { pattern: /\b(travel|tourism|hospitality)\b/i, industry: 'travel' },
  { pattern: /\b(real\s+estate|property|housing)\b/i, industry: 'real estate' },
  { pattern: /\b(e[\s-]?commerce|online\s+store|shopify)\b/i, industry: 'e-commerce' },
  { pattern: /\b(education|edtech|learning)\b/i, industry: 'education' },
  { pattern: /\b(gaming|game|esports)\b/i, industry: 'gaming' },
  { pattern: /\b(food|restaurant|dining|culinary)\b/i, industry: 'food' },
  { pattern: /\b(ai|artificial\s+intelligence|machine\s+learning|ml)\b/i, industry: 'AI' },
  { pattern: /\b(crypto|blockchain|web3|defi)\b/i, industry: 'crypto' },
  { pattern: /\b(startup|early[\s-]stage)\b/i, industry: 'startup' },
  { pattern: /\b(enterprise|corporate)\b/i, industry: 'enterprise' },
  { pattern: /\b(luxury|premium|high[\s-]end)\b/i, industry: 'luxury' },
]

/**
 * Extract industry signals from a message.
 * Returns deduplicated list of detected industries.
 */
export function extractIndustrySignals(message: string): string[] {
  const industries = new Set<string>()
  for (const { pattern, industry } of INDUSTRY_PATTERNS) {
    if (pattern.test(message)) {
      industries.add(industry)
    }
  }
  return Array.from(industries)
}
