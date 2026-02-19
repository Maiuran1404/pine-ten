import 'server-only'
import { createClient, type PhotosWithTotalResults, type Photo } from 'pexels'
import { logger } from '@/lib/logger'

// =============================================================================
// TYPES
// =============================================================================

export interface PexelsPhoto {
  pexelsId: number
  url: string // src.medium (800px wide, good for thumbnails)
  originalUrl: string // src.original for full quality
  photographer: string
  photographerUrl: string
  alt: string
}

export interface PexelsSceneMatch {
  sceneNumber: number
  photos: PexelsPhoto[]
}

export interface StoryboardImageResult {
  sceneMatches: PexelsSceneMatch[]
  totalDuration: number // ms
}

// =============================================================================
// IN-MEMORY CACHE (200 entries, 10-minute TTL)
// =============================================================================

interface CacheEntry {
  photos: PexelsPhoto[]
  timestamp: number
}

const CACHE_MAX_SIZE = 200
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const cache = new Map<string, CacheEntry>()

function getCached(query: string): PexelsPhoto[] | null {
  const entry = cache.get(query)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(query)
    return null
  }
  return entry.photos
}

function setCache(query: string, photos: PexelsPhoto[]) {
  // Evict oldest entries if at capacity
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(query, { photos, timestamp: Date.now() })
}

// =============================================================================
// PEXELS CLIENT
// =============================================================================

function getPexelsClient() {
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) return null
  return createClient(apiKey)
}

// =============================================================================
// SINGLE SCENE SEARCH
// =============================================================================

function mapPhoto(photo: Photo): PexelsPhoto {
  return {
    pexelsId: photo.id,
    url: photo.src.medium,
    originalUrl: photo.src.original,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    alt: photo.alt || '',
  }
}

export async function searchPexelsPhotos(
  query: string,
  perPage: number = 10
): Promise<PexelsPhoto[]> {
  return searchPexelsForScene(query, perPage)
}

async function searchPexelsForScene(query: string, perPage: number = 1): Promise<PexelsPhoto[]> {
  const cached = getCached(query)
  if (cached) return cached

  const client = getPexelsClient()
  if (!client) return []

  try {
    const result = await client.photos.search({
      query,
      per_page: perPage,
      orientation: 'landscape',
    })

    // Type guard: Pexels returns ErrorResponse | PhotosWithTotalResults
    if ('error' in result) {
      logger.warn({ error: (result as { error: string }).error, query }, 'Pexels search error')
      return []
    }

    const photos = (result as PhotosWithTotalResults).photos.map(mapPhoto)
    setCache(query, photos)
    return photos
  } catch (err) {
    logger.error({ err, query }, 'Pexels API call failed')
    return []
  }
}

// =============================================================================
// STORYBOARD SEARCH — parallel across all scenes
// =============================================================================

interface SceneInput {
  sceneNumber: number
  imageSearchTerms?: string[]
  visualNote?: string
  description?: string
  title?: string
  voiceover?: string
}

function buildSearchQuery(scene: SceneInput): string {
  // Prefer AI-generated search terms
  if (scene.imageSearchTerms && scene.imageSearchTerms.length > 0) {
    return scene.imageSearchTerms.slice(0, 3).join(' ')
  }
  // Fallback: build from available scene content (prefer visual descriptions)
  const parts: string[] = []
  if (scene.visualNote) parts.push(scene.visualNote)
  if (scene.description) parts.push(scene.description)
  if (parts.length === 0 && scene.title && !scene.title.startsWith('Scene ')) {
    parts.push(scene.title)
  }
  const combined = parts.join(' ').slice(0, 100) // Keep queries concise
  return combined || 'cinematic scene'
}

export async function searchPexelsForStoryboard(
  scenes: SceneInput[]
): Promise<StoryboardImageResult> {
  const client = getPexelsClient()
  if (!client) {
    return { sceneMatches: [], totalDuration: 0 }
  }

  const startTime = Date.now()

  const results = await Promise.allSettled(
    scenes.map(async (scene) => {
      const query = buildSearchQuery(scene)
      const photos = await searchPexelsForScene(query, 1)
      return {
        sceneNumber: scene.sceneNumber,
        photos,
      } satisfies PexelsSceneMatch
    })
  )

  const sceneMatches: PexelsSceneMatch[] = results
    .filter((r): r is PromiseFulfilledResult<PexelsSceneMatch> => r.status === 'fulfilled')
    .map((r) => r.value)

  const totalDuration = Date.now() - startTime

  logger.debug(
    {
      sceneCount: scenes.length,
      matchCount: sceneMatches.filter((m) => m.photos.length > 0).length,
      totalDuration,
    },
    'Pexels storyboard search complete'
  )

  return { sceneMatches, totalDuration }
}
