import 'server-only'
import { falGenerate, isFalAvailable, toDataUri } from './fal-client'
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types'
import { logger } from '@/lib/logger'

// =============================================================================
// FLUX.2 PRO — high-quality image generation via fal.ai
// Supports up to 9 reference images for style-guided generation.
// Endpoint: fal-ai/flux-pro/v1.1
// =============================================================================

interface Flux2ProInput {
  prompt: string
  image_size?:
    | 'square_hd'
    | 'square'
    | 'portrait_4_3'
    | 'portrait_16_9'
    | 'landscape_4_3'
    | 'landscape_16_9'
  num_inference_steps?: number
  guidance_scale?: number
  num_images?: number
  safety_tolerance?: string
  image_urls?: string[]
}

interface Flux2ProOutput {
  images: Array<{
    url: string
    content_type: string
  }>
}

function mapAspectRatio(ratio?: '3:2' | '1:1' | '2:3'): Flux2ProInput['image_size'] {
  switch (ratio) {
    case '1:1':
      return 'square_hd'
    case '2:3':
      return 'portrait_4_3'
    case '3:2':
    default:
      return 'landscape_16_9'
  }
}

export const flux2ProProvider: ImageProvider = {
  name: 'flux2-pro',

  isAvailable(): boolean {
    return isFalAvailable()
  },

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const input: Flux2ProInput = {
      prompt: request.prompt,
      image_size: mapAspectRatio(request.aspectRatio),
      num_inference_steps: 28,
      guidance_scale: 5.0,
      num_images: 1,
      safety_tolerance: '5',
    }

    // Build reference image list: anchor image first (if present), then style refs
    const allRefs: string[] = []

    // Prepend hero anchor image for consistency — this is the key fix:
    // FLUX.2 Pro uses reference images for style matching, so placing the hero
    // frame first ensures all subsequent scenes match its visual DNA.
    if (request.anchorImage) {
      allRefs.push(toDataUri(request.anchorImage.base64, request.anchorImage.mimeType))
      logger.debug('FLUX.2 Pro: prepended anchor image as first reference')
    }

    // Append style reference images
    if (request.referenceImages && request.referenceImages.length > 0) {
      for (const img of request.referenceImages) {
        allRefs.push(toDataUri(img.base64, img.mimeType))
      }
    }

    // Cap at 9 total (FLUX.2 Pro limit) and attach
    if (allRefs.length > 0) {
      input.image_urls = allRefs.slice(0, 9)
      logger.debug(
        { refCount: input.image_urls.length, hasAnchor: !!request.anchorImage },
        'FLUX.2 Pro: attached reference images'
      )
    }

    const { data, latencyMs } = await falGenerate<Flux2ProInput, Flux2ProOutput>(
      'fal-ai/flux-pro/v1.1',
      input
    )

    if (!data.images || data.images.length === 0) {
      throw new Error('FLUX.2 Pro returned no images')
    }

    const imageResult = data.images[0]

    // Fetch the image URL and convert to base64
    const response = await fetch(imageResult.url)
    if (!response.ok) {
      throw new Error(`Failed to download FLUX.2 Pro image: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = imageResult.content_type || 'image/jpeg'
    const format = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpeg'

    return {
      base64,
      format: format as 'png' | 'webp' | 'jpeg',
      provider: 'flux2-pro',
      latencyMs,
    }
  },
}
