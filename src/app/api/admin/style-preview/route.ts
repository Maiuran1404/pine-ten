import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { generateSceneImage } from '@/lib/ai/image-generation'
import { stylePreviewSchema } from '@/lib/validations'
import { buildStylePreviewPrompt } from '@/lib/ai/style-prompt-builder'
import { fetchReferenceImagesAsBase64 } from '@/lib/ai/reference-image-utils'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/style-preview
 *
 * Generate a preview image for a style preset with a given subject.
 * If styleId is provided, includes reference images in the generation request.
 * Returns base64 image data — no DB save, no Supabase upload.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const body = stylePreviewSchema.parse(await request.json())
    const { subject, promptGuide, styleName, size, quality, styleId } = body

    logger.info(
      { styleName, subject: subject.slice(0, 50), hasStyleId: !!styleId },
      'Generating style preview'
    )

    // Look up reference images if styleId provided
    let referenceImages: Array<{ base64: string; mimeType: string }> | undefined
    if (styleId) {
      const [style] = await db
        .select({ styleReferenceImages: deliverableStyleReferences.styleReferenceImages })
        .from(deliverableStyleReferences)
        .where(eq(deliverableStyleReferences.id, styleId))
        .limit(1)

      const urls = style?.styleReferenceImages ?? []
      if (urls.length > 0) {
        referenceImages = await fetchReferenceImagesAsBase64(urls)
        logger.info(
          { styleId, refImageCount: referenceImages.length },
          'Fetched reference images for preview'
        )
      }
    }

    const hasRefImages = !!referenceImages && referenceImages.length > 0
    const prompt = buildStylePreviewPrompt(styleName, promptGuide, subject, hasRefImages)

    const result = await generateSceneImage(prompt, { size, quality, referenceImages })

    logger.info({ styleName }, 'Style preview generated')

    return successResponse({ base64: result.base64, format: result.format }, 200)
  })
}
