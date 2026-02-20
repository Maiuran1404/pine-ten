import 'server-only'
import { logger } from '@/lib/logger'
import type { StoryboardImage } from '@/lib/ai/storyboard-image-types'

// =============================================================================
// FILM-GRAB CLIENT — HD film stills via free WordPress REST API
// =============================================================================

// In-memory cache: 200 entries, 15-minute TTL
interface CacheEntry {
  images: StoryboardImage[]
  timestamp: number
}

const CACHE_MAX_SIZE = 200
const CACHE_TTL_MS = 15 * 60 * 1000

const cache = new Map<string, CacheEntry>()

function getCached(key: string): StoryboardImage[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.images
}

function setCache(key: string, images: StoryboardImage[]) {
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, { images, timestamp: Date.now() })
}

// WordPress REST API post shape (minimal)
interface WpPost {
  id: number
  link: string
  title: { rendered: string }
  content: { rendered: string }
}

// Regex to extract image URLs from Film-Grab post HTML content
// Film-Grab uses photo gallery with thumb images
const IMG_REGEX = /<img[^>]+src="(https?:\/\/film-grab\.com\/wp-content\/uploads\/[^"]+)"/g

/**
 * Search Film-Grab for cinematic stills matching the given film titles.
 * Returns the first image from each matching film post.
 */
export async function searchFilmGrabForScene(
  filmTitles: string[],
  maxResults: number = 3
): Promise<StoryboardImage[]> {
  if (!filmTitles || filmTitles.length === 0) return []

  const cacheKey = filmTitles.join('|')
  const cached = getCached(cacheKey)
  if (cached) return cached

  const results: StoryboardImage[] = []

  for (const title of filmTitles) {
    if (results.length >= maxResults) break

    try {
      const searchUrl = `https://film-grab.com/wp-json/wp/v2/posts?search=${encodeURIComponent(title)}&per_page=2`
      const response = await fetch(searchUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        logger.debug({ status: response.status, title }, 'Film-Grab search returned non-OK')
        continue
      }

      const posts: WpPost[] = await response.json()

      for (const post of posts) {
        if (results.length >= maxResults) break

        const imageUrl = extractFirstImageUrl(post.content.rendered)
        if (!imageUrl) continue

        // Convert thumb URL to full-size if possible
        const fullUrl = imageUrl.replace('/photo-gallery/thumb/', '/photo-gallery/')

        const cleanTitle = decodeHtmlEntities(post.title.rendered)

        results.push({
          id: `filmgrab_${post.id}`,
          url: imageUrl,
          originalUrl: fullUrl,
          source: 'film-grab',
          mediaType: 'still',
          alt: `Film still from ${cleanTitle}`,
          attribution: {
            sourceName: 'Film-Grab',
            sourceUrl: post.link,
            filmTitle: cleanTitle,
          },
        })
      }
    } catch (err) {
      logger.debug({ err, title }, 'Film-Grab search failed for title')
    }
  }

  setCache(cacheKey, results)

  logger.debug(
    { titleCount: filmTitles.length, resultCount: results.length },
    'Film-Grab scene search complete'
  )

  return results
}

function extractFirstImageUrl(html: string): string | null {
  IMG_REGEX.lastIndex = 0
  const match = IMG_REGEX.exec(html)
  return match?.[1] ?? null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}
