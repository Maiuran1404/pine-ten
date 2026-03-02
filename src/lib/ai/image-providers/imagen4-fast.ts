import 'server-only'
import { GoogleGenAI } from '@google/genai'
import type { ImageProvider, ImageGenerationRequest, ImageGenerationResponse } from './types'
import { logger } from '@/lib/logger'

// =============================================================================
// IMAGEN 4 FAST — Google's latest image generation model (fast variant)
// Higher quality than Imagen 3, faster than Imagen 4 Ultra.
// Model: imagen-4.0-generate-001
// =============================================================================

const DEFAULT_NEGATIVE_PROMPT =
  'text, watermark, logo, blurry, distorted, low quality, UI elements, buttons, interface, screenshot, words, letters, captions, subtitles'

function mapAspectRatio(ratio?: '3:2' | '1:1' | '2:3'): string {
  switch (ratio) {
    case '1:1':
      return '1:1'
    case '2:3':
      return '2:3'
    case '3:2':
    default:
      return '3:2'
  }
}

export const imagen4FastProvider: ImageProvider = {
  name: 'imagen4-fast',

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY
  },

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const ai = new GoogleGenAI({ apiKey })
    const aspectRatio = mapAspectRatio(request.aspectRatio)
    const start = Date.now()

    logger.debug(
      { promptLength: request.prompt.length, aspectRatio, model: 'imagen-4.0-generate-001' },
      'Calling Imagen 4 Fast'
    )

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: request.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        negativePrompt: request.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      },
    })

    const latencyMs = Date.now() - start
    const generatedImage = response.generatedImages?.[0]
    if (!generatedImage?.image?.imageBytes) {
      throw new Error('No image data returned from Imagen 4 Fast')
    }

    return {
      base64: generatedImage.image.imageBytes,
      format: 'png',
      provider: 'imagen4-fast',
      latencyMs,
    }
  },
}
