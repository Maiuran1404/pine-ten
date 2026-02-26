import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// ARE.NA CLIENT — curated visual references via public REST API (no key needed)
// =============================================================================

const cache = createTTLCache<StoryboardImage[]>(200, 10 * 60 * 1000)

interface ArenaBlock {
  id: number
  title: string | null
  image?: {
    filename: string
    content_type: string
    display: { url: string }
    thumb: { url: string }
    original: { url: string }
  }
  source?: {
    url: string
  }
  class: string
}

interface ArenaSearchResponse {
  blocks?: ArenaBlock[]
}

/**
 * Search Are.na for curated visual references via their public REST API.
 * No API key required — the endpoint is public with generous rate limits.
 */
export async function searchArenaForScene(
  searchTerms: string[],
  count: number = 3
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const query = searchTerms.slice(0, 3).join(' ')
  const cacheKey = `${query}:${count}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      q: query,
      per: String(count + 2), // Fetch extra to account for non-image blocks
    })

    const response = await fetch(`https://api.are.na/v2/search/blocks?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      logger.debug({ status: response.status, query }, 'Are.na API returned non-OK')
      return []
    }

    const data: ArenaSearchResponse = await response.json()
    const blocks = data.blocks || []

    const results: StoryboardImage[] = blocks
      .filter(
        (block): block is ArenaBlock & { image: NonNullable<ArenaBlock['image']> } =>
          block.class === 'Image' && !!block.image?.display?.url
      )
      .slice(0, count)
      .map((block) => ({
        id: `arena_${block.id}`,
        url: block.image.thumb?.url || block.image.display.url,
        originalUrl: block.image.original?.url || block.image.display.url,
        source: 'arena' as const,
        mediaType: 'still' as const,
        alt: block.title || 'Curated reference from Are.na',
        attribution: {
          sourceName: 'Are.na',
          sourceUrl: `https://www.are.na/block/${block.id}`,
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Are.na scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Are.na API call failed')
    return []
  }
}
