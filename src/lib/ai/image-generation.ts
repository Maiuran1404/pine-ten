import 'server-only'
import { GoogleGenAI, Modality } from '@google/genai'
import { logger } from '@/lib/logger'

// Re-export prompt builder from shared module (no server-only restriction)
export { buildScenePrompt, type ScenePromptInput } from './scene-prompt-builder'

// =============================================================================
// GEMINI IMAGE GENERATION — server-only module for calling Google Gemini API
// Supports multimodal input: text prompts + reference images → image output
// =============================================================================

export interface GenerateImageOptions {
  size?: '1536x1024' | '1024x1024' | '1024x1536'
  quality?: 'low' | 'medium' | 'high'
  referenceImages?: Array<{ base64: string; mimeType: string }>
}

export interface GenerateImageResult {
  base64: string
  format: 'png' | 'webp'
}

/** Map size strings to Gemini aspect ratio values */
function sizeToAspectRatio(size: string): string | undefined {
  switch (size) {
    case '1536x1024':
      return '3:2'
    case '1024x1024':
      return '1:1'
    case '1024x1536':
      return '2:3'
    default:
      return undefined
  }
}

/**
 * Call Google Gemini to generate a single image.
 * Supports multimodal input — pass reference images to guide style transfer.
 * Returns base64 image data. Throws on API errors.
 */
export async function generateSceneImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured on server')
  }

  const { size = '1536x1024', referenceImages } = options

  const ai = new GoogleGenAI({ apiKey })

  // Build content parts: reference images first, then text prompt
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

  // Add reference images as inline data parts
  if (referenceImages && referenceImages.length > 0) {
    const maxImages = Math.min(referenceImages.length, 14) // Gemini supports up to 14
    for (let i = 0; i < maxImages; i++) {
      parts.push({
        inlineData: {
          data: referenceImages[i].base64,
          mimeType: referenceImages[i].mimeType,
        },
      })
    }
    logger.debug({ imageCount: maxImages }, 'Attached reference images to Gemini request')
  }

  // Add text prompt
  parts.push({ text: prompt })

  const aspectRatio = sizeToAspectRatio(size)

  logger.debug(
    { promptLength: prompt.length, size, aspectRatio, hasRefImages: !!referenceImages?.length },
    'Calling Gemini image generation'
  )

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
    },
  })

  // Extract image from response
  const candidates = response.candidates
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates returned from Gemini')
  }

  const responseParts = candidates[0].content?.parts
  if (!responseParts) {
    throw new Error('No content parts in Gemini response')
  }

  // Find the image part in the response
  for (const part of responseParts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png'
      const format = mimeType.includes('webp') ? 'webp' : 'png'
      return { base64: part.inlineData.data, format }
    }
  }

  throw new Error('Unexpected response format from Gemini — no image data in response')
}
