import 'server-only'
import { logger } from '@/lib/logger'
import type {
  SceneSearchInput,
  SceneImageMatch,
  StoryboardImage,
  StoryboardImageSearchResult,
  ImageSource,
} from '@/lib/ai/storyboard-image-types'
import { searchFilmGrabForScene } from '@/lib/ai/filmgrab-image-search'
import { searchFlimForScene } from '@/lib/ai/flim-image-search'
import { getEyecannndyForScene } from '@/lib/ai/eyecannndy-image-search'
import { searchPexelsForScene } from '@/lib/ai/pexels-image-search'

export type { SceneImageMatch, StoryboardImageSearchResult }

// =============================================================================
// UNIFIED STORYBOARD IMAGE SEARCH — orchestrates all sources per scene
// =============================================================================

/**
 * Search multiple image sources in parallel for each storyboard scene.
 *
 * Priority for primary image: Film-Grab > Flim.ai > Pexels (cinematic preferred).
 * Eyecannndy GIFs are always supplementary (technique references).
 */
export async function searchStoryboardImages(
  scenes: SceneSearchInput[]
): Promise<StoryboardImageSearchResult> {
  const startTime = Date.now()
  const sourcesUsed = new Set<ImageSource>()

  const sceneResults = await Promise.allSettled(scenes.map((scene) => searchForSingleScene(scene)))

  const sceneMatches: SceneImageMatch[] = sceneResults
    .filter((r): r is PromiseFulfilledResult<SceneImageMatch> => r.status === 'fulfilled')
    .map((r) => {
      for (const img of r.value.images) {
        sourcesUsed.add(img.source)
      }
      return r.value
    })

  const totalDuration = Date.now() - startTime

  logger.debug(
    {
      sceneCount: scenes.length,
      matchCount: sceneMatches.filter((m) => m.images.length > 0).length,
      sourcesUsed: [...sourcesUsed],
      totalDuration,
    },
    'Storyboard multi-source image search complete'
  )

  return {
    sceneMatches,
    totalDuration,
    sourcesUsed: [...sourcesUsed],
  }
}

/**
 * Per-scene orchestration: fire all applicable sources in parallel,
 * merge results, pick best primary image.
 */
async function searchForSingleScene(scene: SceneSearchInput): Promise<SceneImageMatch> {
  const promises: Promise<StoryboardImage[]>[] = []
  const sourceOrder: ImageSource[] = []

  // 1. Film-Grab: if filmTitleSuggestions exist
  if (scene.filmTitleSuggestions && scene.filmTitleSuggestions.length > 0) {
    promises.push(withTimeout(searchFilmGrabForScene(scene.filmTitleSuggestions, 2), 5000))
    sourceOrder.push('film-grab')
  }

  // 2. Flim.ai: if imageSearchTerms exist AND SERPER_API_KEY is set
  if (scene.imageSearchTerms && scene.imageSearchTerms.length > 0 && process.env.SERPER_API_KEY) {
    promises.push(withTimeout(searchFlimForScene(scene.imageSearchTerms, 2), 5000))
    sourceOrder.push('flim-ai')
  }

  // 3. Pexels: if imageSearchTerms exist AND PEXELS_API_KEY is set
  if (scene.imageSearchTerms && scene.imageSearchTerms.length > 0 && process.env.PEXELS_API_KEY) {
    promises.push(withTimeout(searchPexelsForSceneAsStoryboardImages(scene), 5000))
    sourceOrder.push('pexels')
  }

  // 4. Eyecannndy: synchronous, always runs if visualTechniques exist
  const eyecannndyResults =
    scene.visualTechniques && scene.visualTechniques.length > 0
      ? getEyecannndyForScene(scene.visualTechniques)
      : []

  // Wait for all async sources
  const settled = await Promise.allSettled(promises)

  // Collect results in source priority order (Film-Grab > Flim.ai > Pexels)
  const allImages: StoryboardImage[] = []

  for (let i = 0; i < settled.length; i++) {
    if (settled[i].status === 'fulfilled') {
      const images = (settled[i] as PromiseFulfilledResult<StoryboardImage[]>).value
      allImages.push(...images)
    }
  }

  // Add Eyecannndy results last (supplementary)
  allImages.push(...eyecannndyResults)

  // Primary selection: first non-gif image in priority order (Film-Grab > Flim.ai > Pexels)
  const primaryIndex = allImages.findIndex((img) => img.mediaType === 'still')

  return {
    sceneNumber: scene.sceneNumber,
    images: allImages,
    primaryIndex: primaryIndex >= 0 ? primaryIndex : 0,
  }
}

/**
 * Adapter: convert existing Pexels search results to StoryboardImage format.
 */
async function searchPexelsForSceneAsStoryboardImages(
  scene: SceneSearchInput
): Promise<StoryboardImage[]> {
  const query = scene.imageSearchTerms?.slice(0, 3).join(' ') || ''
  if (!query) return []

  const photos = await searchPexelsForScene(query, 1)
  return photos.map((photo) => ({
    id: `pexels_${photo.pexelsId}`,
    url: photo.url,
    originalUrl: photo.originalUrl,
    source: 'pexels' as const,
    mediaType: 'still' as const,
    alt: photo.alt || 'Stock photo from Pexels',
    attribution: {
      sourceName: 'Pexels',
      sourceUrl: photo.photographerUrl || 'https://www.pexels.com',
      photographer: photo.photographer,
    },
  }))
}

/**
 * Wrap a promise with a timeout. Returns empty array on timeout.
 */
function withTimeout<T extends StoryboardImage[]>(
  promise: Promise<T>,
  ms: number
): Promise<StoryboardImage[]> {
  return Promise.race([
    promise,
    new Promise<StoryboardImage[]>((resolve) => setTimeout(() => resolve([]), ms)),
  ])
}
