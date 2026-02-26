import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// HOUZZ CLIENT — interior design photography via Serper site: proxy
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
 * Search Houzz for interior design photography via Serper image search with
 * site: filter.
 * Requires SERPER_API_KEY env var — returns empty array if not configured.
 */
export async function searchHouzzForScene(
  searchTerms: string[],
  count: number = 3
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const query = `site:houzz.com/photos ${searchTerms.slice(0, 3).join(' ')}`

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
      logger.debug({ status: response.status, query }, 'Houzz Serper search returned non-OK')
      return []
    }

    const data: SerperImageResponse = await response.json()
    const serperImages = data.images || []

    const results: StoryboardImage[] = serperImages
      .filter((img) => img.imageUrl || img.thumbnailUrl)
      .slice(0, count)
      .map((img, index) => ({
        id: `houzz_${Date.now()}_${index}`,
        url: img.thumbnailUrl || img.imageUrl,
        originalUrl: img.imageUrl || undefined,
        source: 'houzz' as const,
        mediaType: 'still' as const,
        alt: img.title || 'Interior design reference from Houzz',
        attribution: {
          sourceName: 'Houzz',
          sourceUrl: img.link || 'https://houzz.com',
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Houzz scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Houzz Serper search failed')
    return []
  }
}
