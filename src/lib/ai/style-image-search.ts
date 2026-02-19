import 'server-only'
import { logger } from '@/lib/logger'
import { searchDesignReferences, type SerperImageResult } from './serper-image-search'
import { searchPexelsPhotos, type PexelsPhoto } from './pexels-image-search'
import {
  buildSearchTermsFromContext,
  buildDifferentSearchTerms,
} from './style-search-query-builder'
import type { StyleContext } from './brand-style-scoring'

// =============================================================================
// TYPES
// =============================================================================

export interface ImageSearchQuery {
  searchTerms?: string[]
  deliverableType: string
  styleAxis?: string
  mood?: string[]
}

export interface StyleImageAttribution {
  source: 'serper' | 'pexels' | 'db'
  domain: string
  sourceUrl: string
}

export interface SearchedDeliverableStyle {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: string
  styleAxis: string
  subStyle: string | null
  semanticTags: string[]
  brandMatchScore?: number
  matchReason?: string
  attribution?: StyleImageAttribution
}

interface SearchOptions {
  count?: number
  offset?: number
  styleContext?: StyleContext
  excludeTerms?: string[]
}

// =============================================================================
// HELPERS
// =============================================================================

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash).toString(36)
}

function extractTagsFromTitle(title: string): string[] {
  // Extract meaningful words from the title as semantic tags
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
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
    'shall',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'i',
    'we',
    'you',
    'he',
    'she',
    'they',
    'me',
    'us',
    'him',
    'her',
    'them',
    'my',
    'our',
    'your',
    'his',
    'their',
    '-',
    '|',
    '/',
    '\\',
  ])

  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 8)
}

function inferStyleAxis(title: string, domain: string): string {
  const text = `${title} ${domain}`.toLowerCase()

  if (text.includes('minimal') || text.includes('clean') || text.includes('simple')) {
    return 'minimalist'
  }
  if (text.includes('bold') || text.includes('vibrant') || text.includes('colorful')) {
    return 'bold_graphic'
  }
  if (text.includes('gradient') || text.includes('3d') || text.includes('neon')) {
    return 'tech_gradient'
  }
  if (text.includes('luxury') || text.includes('elegant') || text.includes('premium')) {
    return 'luxury_editorial'
  }
  if (text.includes('retro') || text.includes('vintage') || text.includes('nostalgic')) {
    return 'retro'
  }
  if (text.includes('organic') || text.includes('natural') || text.includes('eco')) {
    return 'organic_natural'
  }
  if (text.includes('illustration') || text.includes('hand-drawn') || text.includes('sketch')) {
    return 'illustrated'
  }
  if (text.includes('dark') || text.includes('moody') || text.includes('cinematic')) {
    return 'dark_cinematic'
  }

  return 'reference'
}

// =============================================================================
// SERPER -> DeliverableStyle MAPPER
// =============================================================================

function mapSerperToStyle(
  result: SerperImageResult,
  deliverableType: string,
  styleAxis?: string
): SearchedDeliverableStyle {
  return {
    id: `serper_${result.position}_${hashCode(result.imageUrl)}`,
    name: result.title.slice(0, 80),
    description: `via ${result.domain}`,
    imageUrl: result.thumbnailUrl || result.imageUrl,
    deliverableType,
    styleAxis: styleAxis || inferStyleAxis(result.title, result.domain),
    subStyle: null,
    semanticTags: extractTagsFromTitle(result.title),
    attribution: {
      source: 'serper',
      domain: result.domain,
      sourceUrl: result.link,
    },
  }
}

function mapPexelsToStyle(
  photo: PexelsPhoto,
  deliverableType: string,
  index: number
): SearchedDeliverableStyle {
  return {
    id: `pexels_${photo.pexelsId}`,
    name: photo.alt || `Design reference ${index + 1}`,
    description: `Photo by ${photo.photographer}`,
    imageUrl: photo.url,
    deliverableType,
    styleAxis: 'reference',
    subStyle: null,
    semanticTags: photo.alt ? extractTagsFromTitle(photo.alt) : [],
    attribution: {
      source: 'pexels',
      domain: 'pexels.com',
      sourceUrl: photo.photographerUrl,
    },
  }
}

// =============================================================================
// MAIN SEARCH FUNCTION
// =============================================================================

/**
 * Search for style reference images using Serper.dev (Google Images), with
 * Pexels as fallback. Maps results to the DeliverableStyle interface.
 */
export async function searchStyleImages(
  query: ImageSearchQuery,
  options: SearchOptions = {}
): Promise<SearchedDeliverableStyle[]> {
  const { count = 6, offset = 0, styleContext, excludeTerms } = options

  // Build search query string
  let searchQuery: string

  if (query.searchTerms && query.searchTerms.length > 0) {
    searchQuery = query.searchTerms.join(' ')
  } else if (styleContext) {
    searchQuery = buildSearchTermsFromContext(styleContext, query.deliverableType)
  } else {
    searchQuery = `${query.deliverableType} design reference`
  }

  // Add mood terms if available
  if (query.mood && query.mood.length > 0) {
    searchQuery += ' ' + query.mood.slice(0, 2).join(' ')
  }

  // Apply exclusion terms for "different" queries
  if (excludeTerms && excludeTerms.length > 0) {
    searchQuery = buildDifferentSearchTerms(searchQuery, excludeTerms)
  }

  // Fetch more than needed to account for offset
  const fetchCount = count + offset

  // Try Serper first
  const serperResults = await searchDesignReferences(searchQuery, fetchCount)

  if (serperResults.length >= 3) {
    const styles = serperResults
      .slice(offset, offset + count)
      .map((r) => mapSerperToStyle(r, query.deliverableType, query.styleAxis))

    logger.debug(
      { query: searchQuery, resultCount: styles.length, source: 'serper' },
      'Style image search complete'
    )
    return styles
  }

  // Fallback to Pexels
  logger.debug(
    { query: searchQuery, serperCount: serperResults.length },
    'Serper returned insufficient results — falling back to Pexels'
  )

  const pexelsPhotos = await searchPexelsPhotos(searchQuery, fetchCount)
  if (pexelsPhotos.length > 0) {
    const styles = pexelsPhotos
      .slice(offset, offset + count)
      .map((p, i) => mapPexelsToStyle(p, query.deliverableType, offset + i))

    logger.debug(
      { query: searchQuery, resultCount: styles.length, source: 'pexels' },
      'Pexels fallback search complete'
    )
    return styles
  }

  logger.warn({ query: searchQuery }, 'No results from Serper or Pexels')
  return []
}
