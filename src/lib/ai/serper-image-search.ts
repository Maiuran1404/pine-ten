import 'server-only'
import { logger } from '@/lib/logger'

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

interface CacheEntry {
  results: SerperImageResult[]
  timestamp: number
}

const CACHE_MAX_SIZE = 500
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

const cache = new Map<string, CacheEntry>()

function getCached(query: string): SerperImageResult[] | null {
  const entry = cache.get(query)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(query)
    return null
  }
  return entry.results
}

function setCache(query: string, results: SerperImageResult[]) {
  // Evict oldest entries if at capacity
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(query, { results, timestamp: Date.now() })
}

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
  const cached = getCached(cacheKey)
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

    setCache(cacheKey, results)

    logger.debug({ query, resultCount: results.length }, 'Serper image search complete')

    return results
  } catch (err) {
    logger.error({ err, query }, 'Serper API call failed')
    return []
  }
}
