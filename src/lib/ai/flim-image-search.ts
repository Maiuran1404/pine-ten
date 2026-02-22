import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// FLIM.AI CLIENT — 1.6M cinematic stills via Serper site: proxy
// =============================================================================

const cache = createTTLCache<StoryboardImage[]>(200, 15 * 60 * 1000)

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
 * Search Flim.ai for cinematic stills via Serper image search with site: filter.
 * Requires SERPER_API_KEY env var — returns empty array if not configured.
 */
export async function searchFlimForScene(
  searchTerms: string[],
  count: number = 3
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const query = `site:app.flim.ai ${searchTerms.slice(0, 3).join(' ')}`

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
      logger.debug({ status: response.status, query }, 'Flim.ai Serper search returned non-OK')
      return []
    }

    const data: SerperImageResponse = await response.json()
    const serperImages = data.images || []

    const results: StoryboardImage[] = serperImages
      .filter((img) => img.imageUrl || img.thumbnailUrl)
      .slice(0, count)
      .map((img, index) => ({
        id: `flim_${Date.now()}_${index}`,
        url: img.thumbnailUrl || img.imageUrl,
        originalUrl: img.imageUrl || undefined,
        source: 'flim-ai' as const,
        mediaType: 'still' as const,
        alt: img.title || 'Cinematic still from Flim.ai',
        attribution: {
          sourceName: 'Flim.ai',
          sourceUrl: img.link || 'https://app.flim.ai',
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Flim.ai scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Flim.ai Serper search failed')
    return []
  }
}
