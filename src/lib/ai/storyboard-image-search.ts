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
import { searchUnsplashForScene } from '@/lib/ai/unsplash-image-search'
import { searchDribbbleForScene } from '@/lib/ai/dribbble-image-search'

export type { SceneImageMatch, StoryboardImageSearchResult }

// =============================================================================
// STYLE CATEGORY DETECTION
// =============================================================================

type StyleCategory = 'stock' | 'cinematic' | 'design' | 'default'

const STYLE_PATTERNS: Record<Exclude<StyleCategory, 'default'>, RegExp> = {
  stock: /\b(minimal|clean|corporate|modern|simple|professional|white|sleek|flat)\b/i,
  cinematic: /\b(cinematic|dramatic|moody|film|dark|noir|atmospheric|gritty)\b/i,
  design: /\b(design|ui|ux|branding|logo|graphic|illustration|interface|app)\b/i,
}

function detectStyleCategory(styleHint?: string): StyleCategory {
  if (!styleHint) return 'default'

  // Check each pattern — first match wins (ordered by specificity)
  for (const [category, pattern] of Object.entries(STYLE_PATTERNS)) {
    if (pattern.test(styleHint)) {
      return category as StyleCategory
    }
  }

  return 'default'
}

// =============================================================================
// SEARCH TERM ENRICHMENT — bridge abstract concepts to stock photo tags
// =============================================================================

/**
 * Combine imageSearchTerms with visualNote/description for more visually
 * concrete search queries. Stock photos are tagged with what's physically
 * visible, not abstract concepts.
 */
function enrichSearchTerms(scene: SceneSearchInput): string[] {
  const terms: string[] = []

  // Start with AI-generated terms (already improved via prompt)
  if (scene.imageSearchTerms) {
    terms.push(...scene.imageSearchTerms.slice(0, 3))
  }

  // Add visualNote words — usually the most concrete visual description
  if (scene.visualNote) {
    const visualWords = scene.visualNote.replace(/[,;]/g, ' ').split(' ').slice(0, 5).join(' ')
    if (visualWords && !terms.includes(visualWords)) {
      terms.push(visualWords)
    }
  }

  // Fallback: first sentence of description
  if (terms.length === 0 && scene.description) {
    terms.push(scene.description.split('.')[0].trim())
  }

  return terms.slice(0, 4)
}

// =============================================================================
// UNIFIED STORYBOARD IMAGE SEARCH — orchestrates all sources per scene
// =============================================================================

/**
 * Search multiple image sources in parallel for each storyboard scene.
 *
 * Source priority adapts to the user's selected visual style:
 * - Stock-first (minimal/clean): Pexels > Unsplash > Dribbble > Flim.ai > Film-Grab
 * - Cinematic (dramatic/moody): Film-Grab > Flim.ai > Pexels > Unsplash
 * - Design (UI/branding): Dribbble > Unsplash > Pexels > Flim.ai > Film-Grab
 * - Default: Unsplash > Pexels > Dribbble > Flim.ai > Film-Grab
 *
 * Eyecannndy GIFs are always supplementary (technique references).
 */
export async function searchStoryboardImages(
  scenes: SceneSearchInput[],
  options?: { styleHint?: string }
): Promise<StoryboardImageSearchResult> {
  const startTime = Date.now()
  const sourcesUsed = new Set<ImageSource>()
  const styleCategory = detectStyleCategory(options?.styleHint)

  logger.debug(
    { styleCategory, styleHint: options?.styleHint },
    'Style-aware image search starting'
  )

  const sceneResults = await Promise.allSettled(
    scenes.map((scene) => searchForSingleScene(scene, styleCategory))
  )

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
      styleCategory,
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

// =============================================================================
// SOURCE BUILDERS — each returns [promise, sourceLabel] or null
// =============================================================================

type SourceEntry = [Promise<StoryboardImage[]>, ImageSource]

function buildFilmGrabSource(scene: SceneSearchInput): SourceEntry | null {
  if (scene.filmTitleSuggestions && scene.filmTitleSuggestions.length > 0) {
    return [withTimeout(searchFilmGrabForScene(scene.filmTitleSuggestions, 2), 5000), 'film-grab']
  }
  return null
}

function buildFlimSource(scene: SceneSearchInput): SourceEntry | null {
  if (scene.imageSearchTerms && scene.imageSearchTerms.length > 0 && process.env.SERPER_API_KEY) {
    return [withTimeout(searchFlimForScene(scene.imageSearchTerms, 2), 5000), 'flim-ai']
  }
  return null
}

function buildPexelsSource(scene: SceneSearchInput): SourceEntry | null {
  const hasTerms = scene.imageSearchTerms && scene.imageSearchTerms.length > 0
  const hasVisualNote = scene.visualNote && scene.visualNote.length > 0
  if ((hasTerms || hasVisualNote) && process.env.PEXELS_API_KEY) {
    return [withTimeout(searchPexelsForSceneAsStoryboardImages(scene), 5000), 'pexels']
  }
  return null
}

function buildUnsplashSource(scene: SceneSearchInput): SourceEntry | null {
  const hasTerms = scene.imageSearchTerms && scene.imageSearchTerms.length > 0
  const hasVisualNote = scene.visualNote && scene.visualNote.length > 0
  if ((hasTerms || hasVisualNote) && process.env.UNSPLASH_ACCESS_KEY) {
    // Enrich search terms with visualNote for better relevance
    const enrichedTerms = enrichSearchTerms(scene)
    return [withTimeout(searchUnsplashForScene(enrichedTerms, 2), 5000), 'unsplash']
  }
  return null
}

function buildDribbbleSource(scene: SceneSearchInput): SourceEntry | null {
  if (scene.imageSearchTerms && scene.imageSearchTerms.length > 0 && process.env.SERPER_API_KEY) {
    return [withTimeout(searchDribbbleForScene(scene.imageSearchTerms, 2), 5000), 'dribbble']
  }
  return null
}

// Map from style category to ordered source builder functions
const SOURCE_PRIORITY: Record<StyleCategory, ((scene: SceneSearchInput) => SourceEntry | null)[]> =
  {
    stock: [
      buildPexelsSource,
      buildUnsplashSource,
      buildDribbbleSource,
      buildFlimSource,
      buildFilmGrabSource,
    ],
    cinematic: [buildFilmGrabSource, buildFlimSource, buildPexelsSource, buildUnsplashSource],
    design: [
      buildDribbbleSource,
      buildUnsplashSource,
      buildPexelsSource,
      buildFlimSource,
      buildFilmGrabSource,
    ],
    default: [
      buildUnsplashSource,
      buildPexelsSource,
      buildDribbbleSource,
      buildFlimSource,
      buildFilmGrabSource,
    ],
  }

/**
 * Per-scene orchestration: fire all applicable sources in parallel,
 * merge results in style-aware priority order, pick best primary image.
 */
async function searchForSingleScene(
  scene: SceneSearchInput,
  styleCategory: StyleCategory
): Promise<SceneImageMatch> {
  const builders = SOURCE_PRIORITY[styleCategory]
  const entries: SourceEntry[] = []

  for (const builder of builders) {
    const entry = builder(scene)
    if (entry) entries.push(entry)
  }

  // Eyecannndy: synchronous, always runs if visualTechniques exist
  const eyecannndyResults =
    scene.visualTechniques && scene.visualTechniques.length > 0
      ? getEyecannndyForScene(scene.visualTechniques)
      : []

  // Wait for all async sources
  const settled = await Promise.allSettled(entries.map(([promise]) => promise))

  // Collect results in source priority order
  const allImages: StoryboardImage[] = []

  for (let i = 0; i < settled.length; i++) {
    if (settled[i].status === 'fulfilled') {
      const images = (settled[i] as PromiseFulfilledResult<StoryboardImage[]>).value
      allImages.push(...images)
    }
  }

  // Add Eyecannndy results last (supplementary)
  allImages.push(...eyecannndyResults)

  // Primary selection: first non-gif image in priority order
  const primaryIndex = allImages.findIndex((img) => img.mediaType === 'still')

  return {
    sceneNumber: scene.sceneNumber,
    images: allImages,
    primaryIndex: primaryIndex >= 0 ? primaryIndex : 0,
  }
}

/**
 * Adapter: convert existing Pexels search results to StoryboardImage format.
 * Searches with multiple queries (imageSearchTerms + visualNote fallback)
 * and requests 3 results per query for better coverage.
 */
async function searchPexelsForSceneAsStoryboardImages(
  scene: SceneSearchInput
): Promise<StoryboardImage[]> {
  // Build multiple search queries for better coverage
  const queries: string[] = []

  // Query 1: AI-generated imageSearchTerms (most specific)
  const terms = scene.imageSearchTerms?.slice(0, 3).join(' ') || ''
  if (terms) queries.push(terms)

  // Query 2: visualNote (concrete visual description of the scene)
  if (scene.visualNote) {
    const visualQuery = scene.visualNote.replace(/[,;]/g, ' ').split(' ').slice(0, 5).join(' ')
    if (visualQuery && visualQuery !== terms) queries.push(visualQuery)
  }

  // Query 3: First sentence of description (usually most visual)
  if (scene.description) {
    const firstSentence = scene.description.split('.')[0].trim()
    if (firstSentence && firstSentence.length > 10) {
      const descQuery = firstSentence.split(' ').slice(0, 5).join(' ')
      if (!queries.includes(descQuery)) queries.push(descQuery)
    }
  }

  // Try each query — return first that yields results
  for (const query of queries) {
    const photos = await searchPexelsForScene(query, 3)
    if (photos.length > 0) {
      return photos.slice(0, 2).map((photo) => ({
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
  }

  return []
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
