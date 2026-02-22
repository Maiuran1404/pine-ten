import 'server-only'
import { logger } from '@/lib/logger'
import { createTTLCache } from './ttl-cache'

// =============================================================================
// TYPES
// =============================================================================

export interface SerperImageResult {
  title: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  thumbnailUrl: string
  source: string
  domain: string
  link: string
  position: number
}

interface SerperImageResponse {
  images: SerperImageResult[]
  searchParameters?: {
    q: string
    type: string
    num: number
  }
}

// =============================================================================
// IN-MEMORY CACHE (500 entries, 30-minute TTL)
// =============================================================================

const cache = createTTLCache<SerperImageResult[]>(500, 30 * 60 * 1000)

// =============================================================================
// SERPER CLIENT
// =============================================================================

function getApiKey(): string | null {
  return process.env.SERPER_API_KEY || null
}

/**
 * Search Google Images via Serper.dev API.
 * Returns design reference images from across the web (Dribbble, Behance, Pinterest, etc.)
 */
export async function searchDesignReferences(
  query: string,
  count: number = 10
): Promise<SerperImageResult[]> {
  // Check cache first
  const cacheKey = `${query}:${count}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const apiKey = getApiKey()
  if (!apiKey) {
    logger.debug('SERPER_API_KEY not configured — skipping image search')
    return []
  }

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
    })

    if (!response.ok) {
      logger.warn(
        { status: response.status, statusText: response.statusText, query },
        'Serper API request failed'
      )
      return []
    }

    const data: SerperImageResponse = await response.json()
    const results = data.images || []

    cache.set(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Serper image search complete')

    return results
  } catch (err) {
    logger.error({ err, query }, 'Serper API call failed')
    return []
  }
}
