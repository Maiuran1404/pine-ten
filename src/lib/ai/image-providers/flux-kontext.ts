import 'server-only'
import { falGenerate, isFalAvailable, toDataUri } from './fal-client'
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types'
import { logger } from '@/lib/logger'

// =============================================================================
// FLUX KONTEXT PRO — consistency-anchored image generation via fal.ai
// Takes 1 anchor image (the hero frame) to maintain style/character consistency
// across storyboard scenes. Endpoint: fal-ai/flux-pro/kontext
// =============================================================================

interface FluxKontextInput {
  prompt: string
  image_url?: string
  image_size?:
    | 'square_hd'
    | 'square'
    | 'portrait_4_3'
    | 'portrait_16_9'
    | 'landscape_4_3'
    | 'landscape_16_9'
  num_inference_steps?: number
  guidance_scale?: number
  output_format?: 'jpeg' | 'png'
}

interface FluxKontextOutput {
  images: Array<{
    url: string
    content_type: string
  }>
}

function mapAspectRatio(ratio?: '3:2' | '1:1' | '2:3'): FluxKontextInput['image_size'] {
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

export const fluxKontextProvider: ImageProvider = {
  name: 'flux-kontext',

  isAvailable(): boolean {
    return isFalAvailable()
  },

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!request.anchorImage) {
      throw new Error('Flux Kontext requires an anchor image for consistency')
    }

    const input: FluxKontextInput = {
      prompt: request.prompt,
      image_url: toDataUri(request.anchorImage.base64, request.anchorImage.mimeType),
      image_size: mapAspectRatio(request.aspectRatio),
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format: 'jpeg',
    }

    logger.debug('Flux Kontext: generating with anchor image for consistency')

    const { data, latencyMs } = await falGenerate<FluxKontextInput, FluxKontextOutput>(
      'fal-ai/flux-pro/kontext',
      input
    )

    if (!data.images || data.images.length === 0) {
      throw new Error('Flux Kontext returned no images')
    }

    const imageResult = data.images[0]

    // Fetch the image URL and convert to base64
    const response = await fetch(imageResult.url)
    if (!response.ok) {
      throw new Error(`Failed to download Flux Kontext image: ${response.status}`)
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
      provider: 'flux-kontext',
      latencyMs,
    }
  },
}
