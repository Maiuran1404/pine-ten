'use client'

import { useMemo } from 'react'
import type { DeliverableCategory } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

export interface KeywordSegment {
  text: string
  isKeyword: boolean
  category?: DeliverableCategory
  label?: string
}

export interface DetectedTag {
  keyword: string
  category: DeliverableCategory
  label: string
}

export interface KeywordTaggingResult {
  segments: KeywordSegment[]
  detectedTags: DetectedTag[]
  primaryCategory: DeliverableCategory | null
  hasKeywords: boolean
}

// =============================================================================
// KEYWORD PATTERNS (ordered by length descending for longest-match-first)
// =============================================================================

interface KeywordPattern {
  pattern: RegExp
  category: DeliverableCategory
  label: string
}

const KEYWORD_PATTERNS: KeywordPattern[] = [
  // Multi-word patterns first (longest match wins)
  { pattern: /\bcontent\s+calendar\b/gi, category: 'content', label: 'Content Calendar' },
  { pattern: /\blanding\s+page\b/gi, category: 'website', label: 'Landing Page' },
  { pattern: /\bbrand\s+identity\b/gi, category: 'brand', label: 'Brand Identity' },
  { pattern: /\bsocial\s+media\b/gi, category: 'content', label: 'Social Media' },
  { pattern: /\bexplainer\s+video\b/gi, category: 'video', label: 'Explainer Video' },
  { pattern: /\bpitch\s+deck\b/gi, category: 'design', label: 'Pitch Deck' },
  // Single-word patterns
  { pattern: /\bvideos?\b/gi, category: 'video', label: 'Video' },
  { pattern: /\breels?\b/gi, category: 'video', label: 'Reel' },
  { pattern: /\bwebsite\b/gi, category: 'website', label: 'Website' },
  { pattern: /\blogo\b/gi, category: 'design', label: 'Logo' },
  { pattern: /\bbranding\b/gi, category: 'brand', label: 'Branding' },
  { pattern: /\bcarousel\b/gi, category: 'content', label: 'Carousel' },
  { pattern: /\binstagram\b/gi, category: 'content', label: 'Instagram' },
  { pattern: /\blinkedin\b/gi, category: 'content', label: 'LinkedIn' },
  { pattern: /\bnewsletter\b/gi, category: 'content', label: 'Newsletter' },
  { pattern: /\btiktok\b/gi, category: 'video', label: 'TikTok' },
]

// Priority order for categories when multiple are detected
const CATEGORY_PRIORITY: DeliverableCategory[] = ['video', 'website', 'brand', 'design', 'content']

// =============================================================================
// HOOK
// =============================================================================

export function useKeywordTagging(input: string): KeywordTaggingResult {
  return useMemo(() => {
    if (!input) {
      return { segments: [], detectedTags: [], primaryCategory: null, hasKeywords: false }
    }

    // Track consumed character ranges to avoid overlapping matches
    const consumed: Array<{
      start: number
      end: number
      category: DeliverableCategory
      label: string
    }> = []

    // Find all matches, longest patterns first (KEYWORD_PATTERNS is pre-sorted)
    for (const kp of KEYWORD_PATTERNS) {
      // Create a fresh regex to avoid mutating the module-level pattern's lastIndex
      const regex = new RegExp(kp.pattern.source, kp.pattern.flags)
      let match: RegExpExecArray | null
      while ((match = regex.exec(input)) !== null) {
        const start = match.index
        const end = start + match[0].length

        // Skip if this range overlaps any already-consumed range
        const overlaps = consumed.some((c) => start < c.end && end > c.start)
        if (!overlaps) {
          consumed.push({ start, end, category: kp.category, label: kp.label })
        }
      }
    }

    if (consumed.length === 0) {
      return {
        segments: [{ text: input, isKeyword: false }],
        detectedTags: [],
        primaryCategory: null,
        hasKeywords: false,
      }
    }

    // Sort consumed ranges by start position
    consumed.sort((a, b) => a.start - b.start)

    // Build segments from gaps + matches
    const segments: KeywordSegment[] = []
    let cursor = 0

    for (const c of consumed) {
      if (cursor < c.start) {
        segments.push({ text: input.slice(cursor, c.start), isKeyword: false })
      }
      segments.push({
        text: input.slice(c.start, c.end),
        isKeyword: true,
        category: c.category,
        label: c.label,
      })
      cursor = c.end
    }

    if (cursor < input.length) {
      segments.push({ text: input.slice(cursor), isKeyword: false })
    }

    // Build unique detected tags (deduplicated by label)
    const seenLabels = new Set<string>()
    const detectedTags: DetectedTag[] = []
    for (const c of consumed) {
      if (!seenLabels.has(c.label)) {
        seenLabels.add(c.label)
        detectedTags.push({
          keyword: input.slice(c.start, c.end),
          category: c.category,
          label: c.label,
        })
      }
    }

    // Determine primary category by priority
    const detectedCategories = new Set(detectedTags.map((t) => t.category))
    const primaryCategory = CATEGORY_PRIORITY.find((cat) => detectedCategories.has(cat)) ?? null

    return {
      segments,
      detectedTags,
      primaryCategory,
      hasKeywords: true,
    }
  }, [input])
}
