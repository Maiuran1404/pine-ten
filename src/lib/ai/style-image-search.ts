import 'server-only'
import { logger } from '@/lib/logger'
import { searchDesignReferences, type SerperImageResult } from './serper-image-search'
import { searchPexelsPhotos, type PexelsPhoto } from './pexels-image-search'
import { searchUnsplashForScene } from './unsplash-image-search'
import { searchDribbbleForScene } from './dribbble-image-search'
import { searchFlimForScene } from './flim-image-search'
import { searchBehanceForScene } from './behance-image-search'
import { searchDezeenForScene } from './dezeen-image-search'
import { searchHouzzForScene } from './houzz-image-search'
import { searchArenaForScene } from './arena-image-search'
import type { StoryboardImage } from './storyboard-image-types'
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
  source:
    | 'serper'
    | 'pexels'
    | 'db'
    | 'unsplash'
    | 'dribbble'
    | 'flim-ai'
    | 'behance'
    | 'dezeen'
    | 'houzz'
    | 'arena'
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
  promptGuide?: string
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
// SOURCE MAPPERS
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

function mapStoryboardImageToStyle(
  img: StoryboardImage,
  deliverableType: string,
  styleAxis?: string
): SearchedDeliverableStyle {
  return {
    id: img.id,
    name: img.alt.slice(0, 80),
    description: `via ${img.attribution.sourceName}`,
    imageUrl: img.url,
    deliverableType,
    styleAxis: styleAxis || inferStyleAxis(img.alt, img.attribution.sourceName),
    subStyle: null,
    semanticTags: extractTagsFromTitle(img.alt),
    attribution: {
      source: img.source as StyleImageAttribution['source'],
      domain: img.attribution.sourceName.toLowerCase().replace(/\s/g, '') + '.com',
      sourceUrl: img.attribution.sourceUrl,
    },
  }
}

// =============================================================================
// SOURCE PRIORITY BY DELIVERABLE CATEGORY
// =============================================================================

type SourceKey =
  | 'behance'
  | 'dezeen'
  | 'houzz'
  | 'unsplash'
  | 'arena'
  | 'dribbble'
  | 'flim-ai'
  | 'serper'
  | 'pexels'

function detectCategory(deliverableType: string): string {
  const type = deliverableType.toLowerCase()

  if (
    type.includes('interior') ||
    type.includes('architect') ||
    type.includes('room') ||
    type.includes('space') ||
    type.includes('home')
  ) {
    return 'interior'
  }
  if (
    type.includes('brand') ||
    type.includes('logo') ||
    type.includes('identity') ||
    type.includes('design_asset')
  ) {
    return 'design'
  }
  if (
    type.includes('video') ||
    type.includes('reel') ||
    type.includes('cinematic') ||
    type.includes('launch_video')
  ) {
    return 'video'
  }
  if (
    type.includes('social') ||
    type.includes('instagram') ||
    type.includes('linkedin') ||
    type.includes('content') ||
    type.includes('post')
  ) {
    return 'social'
  }

  return 'default'
}

const SOURCE_PRIORITY: Record<string, SourceKey[]> = {
  interior: ['dezeen', 'houzz', 'behance', 'unsplash', 'arena', 'dribbble', 'serper', 'pexels'],
  design: ['behance', 'dribbble', 'arena', 'unsplash', 'serper', 'pexels'],
  video: ['flim-ai', 'unsplash', 'behance', 'serper', 'pexels'],
  social: ['behance', 'unsplash', 'dribbble', 'arena', 'serper', 'pexels'],
  default: ['behance', 'unsplash', 'dribbble', 'arena', 'dezeen', 'serper', 'pexels'],
}

// Max parallel sources to fire — keeps latency and API usage reasonable
const MAX_PARALLEL_SOURCES = 5

// =============================================================================
// SOURCE DISPATCHERS
// =============================================================================

type SourceFetcher = (
  terms: string[],
  query: string,
  count: number,
  deliverableType: string,
  styleAxis?: string
) => Promise<SearchedDeliverableStyle[]>

const sourceFetchers: Record<SourceKey, SourceFetcher> = {
  behance: async (terms, _q, count, dt, sa) => {
    const imgs = await searchBehanceForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  dezeen: async (terms, _q, count, dt, sa) => {
    const imgs = await searchDezeenForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  houzz: async (terms, _q, count, dt, sa) => {
    const imgs = await searchHouzzForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  unsplash: async (terms, _q, count, dt, sa) => {
    const imgs = await searchUnsplashForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  arena: async (terms, _q, count, dt, sa) => {
    const imgs = await searchArenaForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  dribbble: async (terms, _q, count, dt, sa) => {
    const imgs = await searchDribbbleForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  'flim-ai': async (terms, _q, count, dt, sa) => {
    const imgs = await searchFlimForScene(terms, count)
    return imgs.map((img) => mapStoryboardImageToStyle(img, dt, sa))
  },
  serper: async (_terms, query, count, dt, sa) => {
    const results = await searchDesignReferences(query, count)
    return results.map((r) => mapSerperToStyle(r, dt, sa))
  },
  pexels: async (_terms, query, count, dt) => {
    const photos = await searchPexelsPhotos(query, count)
    return photos.map((p, i) => mapPexelsToStyle(p, dt, i))
  },
}

// =============================================================================
// MAIN SEARCH FUNCTION
// =============================================================================

/**
 * Search for style reference images using a multi-source pipeline.
 * Sources are prioritized by deliverable type and queried in parallel.
 * Results are collected in priority order and deduplicated.
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

  // Build search terms array for sources that take term arrays
  const searchTerms = searchQuery.split(/\s+/).filter(Boolean)

  // Determine source priority based on deliverable type
  const category = detectCategory(query.deliverableType)
  const prioritizedSources = SOURCE_PRIORITY[category] || SOURCE_PRIORITY.default
  const sourcesToQuery = prioritizedSources.slice(0, MAX_PARALLEL_SOURCES)

  // Request 3 images per source — we'll collect and trim
  const perSourceCount = 3

  // Fire all sources in parallel with individual timeouts (handled inside each source)
  const sourcePromises = sourcesToQuery.map(async (sourceKey) => {
    const fetcher = sourceFetchers[sourceKey]
    try {
      const results = await fetcher(
        searchTerms,
        searchQuery,
        perSourceCount,
        query.deliverableType,
        query.styleAxis
      )
      return { sourceKey, results }
    } catch (err) {
      logger.debug({ err, source: sourceKey }, 'Source search failed in style pipeline')
      return { sourceKey, results: [] as SearchedDeliverableStyle[] }
    }
  })

  const settled = await Promise.allSettled(sourcePromises)

  // Collect results in priority order
  const resultsBySource = new Map<SourceKey, SearchedDeliverableStyle[]>()
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      resultsBySource.set(result.value.sourceKey, result.value.results)
    }
  }

  // Merge in priority order, deduplicating by URL
  const seenUrls = new Set<string>()
  const allResults: SearchedDeliverableStyle[] = []

  for (const sourceKey of prioritizedSources) {
    const sourceResults = resultsBySource.get(sourceKey) || []
    for (const style of sourceResults) {
      if (!seenUrls.has(style.imageUrl)) {
        seenUrls.add(style.imageUrl)
        allResults.push(style)
      }
    }
  }

  // Apply offset and count
  const sliced = allResults.slice(offset, offset + count)

  const sourcesUsed = [...new Set(sliced.map((s) => s.attribution?.source).filter(Boolean))]
  logger.debug(
    {
      query: searchQuery,
      category,
      sourcesQueried: sourcesToQuery,
      sourcesUsed,
      totalCollected: allResults.length,
      resultCount: sliced.length,
    },
    'Multi-source style image search complete'
  )

  return sliced
}
