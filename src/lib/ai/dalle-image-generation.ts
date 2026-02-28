import 'server-only'
import { logger } from '@/lib/logger'

// =============================================================================
// DALL-E IMAGE GENERATION — shared module for storyboard scene images
// =============================================================================

interface ScenePromptInput {
  description?: string
  visualNote?: string
  cameraNote?: string
  title?: string
  voiceover?: string
  imageGenerationPrompt?: string
}

/**
 * Build a DALL-E prompt from scene data and style context.
 * Combines scene visual information with the user's selected style direction.
 */
export function buildScenePrompt(scene: ScenePromptInput, styleContext: string): string {
  const parts: string[] = []

  // Prefer the dedicated AI-generated image prompt if available
  if (scene.imageGenerationPrompt) {
    parts.push(scene.imageGenerationPrompt)
  } else {
    // Fall back to composing from scene fields
    if (scene.visualNote) parts.push(scene.visualNote)
    if (scene.description) parts.push(scene.description)
    if (scene.cameraNote) parts.push(`Camera: ${scene.cameraNote}`)
  }

  // Append style context
  if (styleContext) {
    parts.push(`Visual style: ${styleContext}`)
  }

  // Add quality directives
  parts.push('Photorealistic, cinematic lighting, professional production quality.')

  return parts.join('. ').slice(0, 4000) // DALL-E prompt limit
}

export interface GenerateImageOptions {
  size?: '1536x1024' | '1024x1024' | '1024x1536'
  quality?: 'low' | 'medium' | 'high'
}

export interface GenerateImageResult {
  base64: string
  format: 'png' | 'webp'
}

/**
 * Call OpenAI gpt-image-1 to generate a single image.
 * Returns base64 image data. Throws on API errors.
 */
export async function generateSceneImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured on server')
  }

  const { size = '1536x1024', quality = 'low' } = options

  logger.debug({ promptLength: prompt.length, size, quality }, 'Calling DALL-E gpt-image-1')

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size,
      quality,
      n: 1,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const msg = errorData?.error?.message || `OpenAI API error: ${response.status}`
    logger.error({ status: response.status, msg }, 'DALL-E generation failed')
    throw new Error(msg)
  }

  const data = await response.json()
  const imageData = data.data?.[0]

  if (imageData?.b64_json) {
    return { base64: imageData.b64_json, format: 'png' }
  }

  throw new Error('Unexpected response format from OpenAI — no base64 data')
}
