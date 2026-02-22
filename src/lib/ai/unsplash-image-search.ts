import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// UNSPLASH CLIENT — high-quality stock photos via REST API
// =============================================================================

const cache = createTTLCache<StoryboardImage[]>(200, 10 * 60 * 1000)

interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string // 1080px wide
    small: string // 400px wide
    thumb: string
  }
  alt_description: string | null
  description: string | null
  user: {
    name: string
    links: {
      html: string
    }
  }
  links: {
    html: string
  }
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[]
  total: number
  total_pages: number
}

/**
 * Search Unsplash for high-quality stock photos matching scene search terms.
 * Requires UNSPLASH_ACCESS_KEY env var — returns empty array if not configured.
 */
export async function searchUnsplashForScene(
  searchTerms: string[],
  count: number = 2
): Promise<StoryboardImage[]> {
  if (!searchTerms || searchTerms.length === 0) return []

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return []

  const query = searchTerms.slice(0, 3).join(' ')
  const cacheKey = `${query}:${count}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(count),
      orientation: 'landscape',
    })

    const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      logger.debug({ status: response.status, query }, 'Unsplash API returned non-OK')
      return []
    }

    const data: UnsplashSearchResponse = await response.json()

    const results: StoryboardImage[] = data.results
      .filter((photo) => photo.urls.regular || photo.urls.small)
      .slice(0, count)
      .map((photo) => ({
        id: `unsplash_${photo.id}`,
        url: photo.urls.small,
        originalUrl: photo.urls.regular,
        source: 'unsplash' as const,
        mediaType: 'still' as const,
        alt: photo.alt_description || photo.description || 'Photo from Unsplash',
        attribution: {
          sourceName: 'Unsplash',
          sourceUrl: photo.links.html,
          photographer: photo.user.name,
        },
      }))

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Unsplash scene search complete')

    return results
  } catch (err) {
    logger.debug({ err, query }, 'Unsplash API call failed')
    return []
  }
}
