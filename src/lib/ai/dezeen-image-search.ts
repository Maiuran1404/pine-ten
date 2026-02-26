import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// DEZEEN CLIENT — architecture & interior design via Serper site: proxy
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
 * Search Dezeen for architecture and interior design references via Serper
 * image search with site: filter.
 * Requires SERPER_API_KEY env var — returns empty array if not configured.
 */
export async function searchDezeenForScene(
  searchTerms: string[],
  count: number = 3
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const query = `site:dezeen.com ${searchTerms.slice(0, 3).join(' ')} interior architecture`

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
      logger.debug({ status: response.status, query }, 'Dezeen Serper search returned non-OK')
      return []
    }

    const data: SerperImageResponse = await response.json()
    const serperImages = data.images || []

    const results: StoryboardImage[] = serperImages
      .filter((img) => img.imageUrl || img.thumbnailUrl)
      .slice(0, count)
      .map((img, index) => ({
        id: `dezeen_${Date.now()}_${index}`,
        url: img.thumbnailUrl || img.imageUrl,
        originalUrl: img.imageUrl || undefined,
        source: 'dezeen' as const,
        mediaType: 'still' as const,
        alt: img.title || 'Architecture reference from Dezeen',
        attribution: {
          sourceName: 'Dezeen',
          sourceUrl: img.link || 'https://dezeen.com',
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Dezeen scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Dezeen Serper search failed')
    return []
  }
}
