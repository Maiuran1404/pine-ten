import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'
import { generateSceneImage } from '@/lib/ai/dalle-image-generation'
import { uploadToStorage } from '@/lib/storage'
import { generateStyleImageSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

const BUCKET = 'deliverable-styles'

/**
 * Extract hex color codes from a prompt guide text.
 * Matches patterns like #0047AB, #E63946, etc.
 */
function extractHexColors(text: string): string[] {
  const hexRegex = /#[0-9A-Fa-f]{6}\b/g
  const matches = text.match(hexRegex) || []
  // Deduplicate and limit to 8 colors
  return [...new Set(matches.map((c) => c.toUpperCase()))].slice(0, 8)
}

/**
 * Condense a 300-500 word prompt guide into a focused ~150-200 word image generation prompt.
 * Extracts key visual characteristics: color palette, lighting, mood, textures, composition.
 */
function buildImagePrompt(name: string, promptGuide: string): string {
  // Extract the most visually descriptive sentences
  const sentences = promptGuide
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  // Prioritize sentences with visual keywords
  const visualKeywords =
    /color|light|shadow|texture|gradient|palette|tone|mood|surface|grain|lens|camera|shot|photograph|background|foreground|atmosphere|warm|cool|contrast|matte|gloss|metallic|organic|soft|hard|bright|dark|minimal|rich|clean|raw|polished/i
  const visualSentences = sentences.filter((s) => visualKeywords.test(s))

  // Take the most relevant visual descriptions, capped at ~150 words
  const selectedSentences: string[] = []
  let wordCount = 0
  for (const sentence of visualSentences) {
    const words = sentence.split(/\s+/).length
    if (wordCount + words > 150) break
    selectedSentences.push(sentence)
    wordCount += words
  }

  // If we didn't get enough from visual-keyword filtering, add more
  if (wordCount < 80) {
    for (const sentence of sentences) {
      if (selectedSentences.includes(sentence)) continue
      const words = sentence.split(/\s+/).length
      if (wordCount + words > 150) break
      selectedSentences.push(sentence)
      wordCount += words
    }
  }

  const visualDescription = selectedSentences.join('. ').replace(/\.\./g, '.')

  return `Create a professional visual reference image for the "${name}" style direction. ${visualDescription}. This is a standalone atmospheric mood image showcasing this aesthetic. Photorealistic, editorial quality, 16:10 aspect ratio.`
}

/**
 * Delay helper for rate limiting between API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST /api/admin/generate-style-images
 *
 * Generates AI representative images for curated style presets using DALL-E.
 * Also extracts hex color codes from promptGuides and populates colorSamples.
 *
 * Query params:
 *   - styleId: (optional) Generate for a single style ID
 *   - dryRun: (optional) If "true", only extract colors without generating images
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const body = generateStyleImageSchema.parse(Object.fromEntries(searchParams.entries()))

    const { styleId, dryRun } = body

    // Fetch presets with non-null promptGuide
    const conditions = [
      eq(deliverableStyleReferences.isActive, true),
      isNotNull(deliverableStyleReferences.promptGuide),
    ]
    if (styleId) {
      conditions.push(eq(deliverableStyleReferences.id, styleId))
    }

    const presets = await db
      .select()
      .from(deliverableStyleReferences)
      .where(and(...conditions))

    if (presets.length === 0) {
      throw Errors.notFound('No active presets with prompt guides found')
    }

    const results: Array<{
      id: string
      name: string
      status: 'success' | 'skipped' | 'error'
      imageUrl?: string
      colorSamples?: string[]
      error?: string
    }> = []

    for (const preset of presets) {
      const promptGuide = preset.promptGuide!

      // Extract hex colors from the prompt guide
      const colorSamples = extractHexColors(promptGuide)

      // Always update colorSamples if we found any
      if (colorSamples.length > 0) {
        await db
          .update(deliverableStyleReferences)
          .set({ colorSamples, updatedAt: new Date() })
          .where(eq(deliverableStyleReferences.id, preset.id))
      }

      if (dryRun) {
        results.push({
          id: preset.id,
          name: preset.name,
          status: 'skipped',
          colorSamples,
        })
        continue
      }

      try {
        logger.info({ styleId: preset.id, name: preset.name }, 'Generating style image')

        // Build condensed prompt from the full prompt guide
        const imagePrompt = buildImagePrompt(preset.name, promptGuide)

        // Generate image via DALL-E (1024x1024 for style thumbnails, medium quality)
        const result = await generateSceneImage(imagePrompt, {
          size: '1024x1024',
          quality: 'medium',
        })

        // Upload to Supabase storage
        const buffer = Buffer.from(result.base64, 'base64')
        const storagePath = `generated/${preset.id}.png`
        const publicUrl = await uploadToStorage(BUCKET, storagePath, buffer, {
          contentType: 'image/png',
          upsert: true,
        })

        // Update DB record with new image URL and color samples
        await db
          .update(deliverableStyleReferences)
          .set({
            imageUrl: publicUrl,
            colorSamples,
            updatedAt: new Date(),
          })
          .where(eq(deliverableStyleReferences.id, preset.id))

        results.push({
          id: preset.id,
          name: preset.name,
          status: 'success',
          imageUrl: publicUrl,
          colorSamples,
        })

        logger.info(
          { styleId: preset.id, name: preset.name, imageUrl: publicUrl },
          'Style image generated and uploaded'
        )

        // Rate limit: 2s delay between DALL-E calls
        if (presets.indexOf(preset) < presets.length - 1) {
          await delay(2000)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error(
          { styleId: preset.id, name: preset.name, err },
          'Failed to generate style image'
        )
        results.push({
          id: preset.id,
          name: preset.name,
          status: 'error',
          colorSamples,
          error: errorMessage,
        })
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
    }

    return successResponse({ summary, results }, 200)
  })
}
