import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// BEHANCE CLIENT — design portfolios via Serper site: proxy
// =============================================================================

const cache = createTTLCache<StoryboardImage[]>(200, 10 * 60 * 1000)

interface SerperImageResult {
  title: string
  imageUrl: string
  thumbnailUrl: string
  source: string
  domain: string
  link: string
}

interface SerperImageResponse {
  images?: SerperImageResult[]
}

/**
 * Search Behance for design references via Serper image search with site: filter.
 * Requires SERPER_API_KEY env var — returns empty array if not configured.
 */
export async function searchBehanceForScene(
  searchTerms: string[],
  count: number = 3
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const query = `site:behance.net ${searchTerms.slice(0, 3).join(' ')} design`

  const cacheKey = query
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: count,
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      logger.debug({ status: response.status, query }, 'Behance Serper search returned non-OK')
      return []
    }

    const data: SerperImageResponse = await response.json()
    const serperImages = data.images || []

    const results: StoryboardImage[] = serperImages
      .filter((img) => img.imageUrl || img.thumbnailUrl)
      .slice(0, count)
      .map((img, index) => ({
        id: `behance_${Date.now()}_${index}`,
        url: img.thumbnailUrl || img.imageUrl,
        originalUrl: img.imageUrl || undefined,
        source: 'behance' as const,
        mediaType: 'still' as const,
        alt: img.title || 'Design reference from Behance',
        attribution: {
          sourceName: 'Behance',
          sourceUrl: img.link || 'https://behance.net',
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Behance scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Behance Serper search failed')
    return []
  }
}
