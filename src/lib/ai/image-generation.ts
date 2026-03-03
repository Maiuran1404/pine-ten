import 'server-only'
import { generateWithFallback } from './image-providers'
import type { ProviderStrategy, ImageGenerationResponse } from './image-providers/types'
import { logger } from '@/lib/logger'

// Re-export prompt builder from shared module (no server-only restriction)
export { buildScenePrompt, type ScenePromptInput } from './scene-prompt-builder'

// Re-export provider types for consumers
export type { StyleMetadata, BrandContextForPrompt } from './image-providers/types'

// =============================================================================
// IMAGE GENERATION — server-only module for generating storyboard scene images.
// Delegates to the provider abstraction (FLUX.2 Pro, Flux Kontext, Imagen 4/3)
// with automatic fallback.
// =============================================================================

export interface GenerateImageOptions {
  size?: '1536x1024' | '1024x1024' | '1024x1536'
  /** Style reference images for multi-ref providers (FLUX.2 Pro supports up to 9) */
  referenceImages?: Array<{ base64: string; mimeType: string }>
  /** Anchor image for consistency-anchored generation (Flux Kontext) */
  anchorImage?: { base64: string; mimeType: string }
  /** Provider strategy to use */
  strategy?: ProviderStrategy
}

export interface GenerateImageResult {
  base64: string
  format: 'png' | 'webp' | 'jpeg'
  provider?: string
  latencyMs?: number
}

/** Map size strings to aspect ratio values */
function sizeToAspectRatio(size: string): '3:2' | '1:1' | '2:3' {
  switch (size) {
    case '1536x1024':
      return '3:2'
    case '1024x1024':
      return '1:1'
    case '1024x1536':
      return '2:3'
    default:
      return '3:2'
  }
}

/** Default negative prompt to filter common image generation artifacts */
const DEFAULT_NEGATIVE_PROMPT =
  'text, watermark, logo, blurry, distorted, low quality, UI elements, buttons, interface, screenshot, words, letters, captions, subtitles, title cards, typography, readable text, overlay text, call to action, CTA button, free trial, sign up, subscribe'

/**
 * Generate a single scene image using the provider chain.
 *
 * Routes to the appropriate provider strategy:
 * - 'hero': FLUX.2 Pro with reference images -> Imagen 4 -> Imagen 3
 * - 'consistency': Flux Kontext with anchor -> FLUX.2 Pro -> Imagen 4 -> Imagen 3
 * - 'standard': FLUX.2 Pro -> Imagen 4 -> Imagen 3
 * - 'fallback': Imagen 4 -> Imagen 3
 *
 * Returns base64 image data. Throws on API errors.
 */
export async function generateSceneImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const { size = '1536x1024', referenceImages, anchorImage, strategy } = options
  const aspectRatio = sizeToAspectRatio(size)

  // Determine strategy if not explicit
  let resolvedStrategy: ProviderStrategy = strategy || 'standard'
  if (!strategy) {
    if (anchorImage) {
      resolvedStrategy = 'consistency'
    } else if (referenceImages && referenceImages.length > 0) {
      resolvedStrategy = 'hero'
    }
  }

  logger.info(
    {
      strategy: resolvedStrategy,
      promptLength: prompt.length,
      aspectRatio,
      hasRefImages: !!referenceImages?.length,
      hasAnchor: !!anchorImage,
    },
    'Generating scene image'
  )

  const result: ImageGenerationResponse = await generateWithFallback(resolvedStrategy, {
    prompt,
    aspectRatio,
    referenceImages,
    anchorImage,
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  })

  return {
    base64: result.base64,
    format: result.format,
    provider: result.provider,
    latencyMs: result.latencyMs,
  }
}
