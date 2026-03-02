import 'server-only'
import { GoogleGenAI, Modality } from '@google/genai'
import { logger } from '@/lib/logger'

// Re-export prompt builder from shared module (no server-only restriction)
export { buildScenePrompt, type ScenePromptInput } from './scene-prompt-builder'

// =============================================================================
// IMAGE GENERATION — server-only module for generating storyboard scene images
// Dual-path: Imagen 3 for standard generation, Gemini for multimodal (with
// reference images). Both use the Google GenAI SDK.
// =============================================================================

/** Default negative prompt to filter common image generation artifacts */
const DEFAULT_NEGATIVE_PROMPT =
  'text, watermark, logo, blurry, distorted, low quality, UI elements, buttons, interface, screenshot, words, letters, captions, subtitles'

export interface GenerateImageOptions {
  size?: '1536x1024' | '1024x1024' | '1024x1536'
  referenceImages?: Array<{ base64: string; mimeType: string }>
}

export interface GenerateImageResult {
  base64: string
  format: 'png' | 'webp'
}

/** Map size strings to aspect ratio values (shared by both Imagen and Gemini) */
function sizeToAspectRatio(size: string): string {
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

/**
 * Generate a scene image using Imagen 3 (production model).
 * Higher quality than Gemini for text-only prompts. Supports native
 * aspectRatio and negativePrompt parameters.
 */
async function generateWithImagen(
  ai: GoogleGenAI,
  prompt: string,
  aspectRatio: string
): Promise<GenerateImageResult> {
  logger.debug(
    { promptLength: prompt.length, aspectRatio, model: 'imagen-3.0-generate-002' },
    'Calling Imagen 3 image generation'
  )

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    },
  })

  const generatedImage = response.generatedImages?.[0]
  if (!generatedImage?.image?.imageBytes) {
    throw new Error('No image data returned from Imagen 3')
  }

  return {
    base64: generatedImage.image.imageBytes,
    format: 'png',
  }
}

/**
 * Generate a scene image using Gemini multimodal (generateContent).
 * Used when reference images are provided for style-guided generation.
 * Appends a negative directive to the prompt since Gemini doesn't support
 * native negativePrompt.
 */
async function generateWithGemini(
  ai: GoogleGenAI,
  prompt: string,
  referenceImages: Array<{ base64: string; mimeType: string }>
): Promise<GenerateImageResult> {
  // Build content parts: reference images first, then text prompt
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

  // Add reference images as inline data parts
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

  // Append negative directive to prompt (Gemini has no native negativePrompt)
  const augmentedPrompt = `${prompt}\n\nIMPORTANT: Do NOT include any ${DEFAULT_NEGATIVE_PROMPT} in the generated image.`
  parts.push({ text: augmentedPrompt })

  logger.debug(
    {
      promptLength: augmentedPrompt.length,
      refImageCount: maxImages,
      model: 'gemini-2.0-flash-exp-image-generation',
    },
    'Calling Gemini multimodal image generation'
  )

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp-image-generation',
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
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

/**
 * Generate a single scene image. Routes to the best model:
 * - With reference images → Gemini multimodal (style-guided generation)
 * - Without reference images → Imagen 3 (higher quality production model)
 *
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
  const aspectRatio = sizeToAspectRatio(size)

  try {
    // Route: reference images present → Gemini multimodal, otherwise → Imagen 3
    if (referenceImages && referenceImages.length > 0) {
      return await generateWithGemini(ai, prompt, referenceImages)
    }
    return await generateWithImagen(ai, prompt, aspectRatio)
  } catch (err: unknown) {
    // Extract readable message from Google SDK errors (they stringify as [object Object])
    const errObj = err as { message?: string; status?: number }
    let msg = 'Image generation API error'
    if (typeof errObj.message === 'string') {
      try {
        const parsed = JSON.parse(errObj.message)
        msg = parsed?.error?.message ?? errObj.message
      } catch {
        msg = errObj.message
      }
    }
    logger.error({ err, msg, hasRefImages: !!referenceImages?.length }, 'Image generation failed')
    throw new Error(msg)
  }
}
