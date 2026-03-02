import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { buildScenePrompt, generateSceneImage } from '@/lib/ai/image-generation'
import { uploadToStorage } from '@/lib/storage'
import { fetchReferenceImagesAsBase64 } from '@/lib/ai/reference-image-utils'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const maxDuration = 60

const regenerateSchema = z.object({
  scene: z.object({
    sceneNumber: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    visualNote: z.string().optional(),
    cameraNote: z.string().optional(),
    voiceover: z.string().optional(),
    transition: z.string().optional(),
    imageGenerationPrompt: z.string().optional(),
  }),
  styleContext: z.string().max(2000),
  briefId: z.string().min(1),
  customPrompt: z.string().max(4000).optional(),
  styleIds: z.array(z.string().uuid()).max(5).optional(),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = regenerateSchema.parse(await request.json())

    // Fetch reference images from selected styles (if any)
    let referenceImages: Array<{ base64: string; mimeType: string }> | undefined
    if (body.styleIds && body.styleIds.length > 0) {
      const styles = await db
        .select({ styleReferenceImages: deliverableStyleReferences.styleReferenceImages })
        .from(deliverableStyleReferences)
        .where(inArray(deliverableStyleReferences.id, body.styleIds))

      const allUrls = [...new Set(styles.flatMap((s) => s.styleReferenceImages ?? []))]
      if (allUrls.length > 0) {
        referenceImages = await fetchReferenceImagesAsBase64(allUrls, 10)
        logger.info(
          { refImageCount: referenceImages.length },
          'Fetched style reference images for scene regeneration'
        )
      }
    }

    // Use custom prompt if provided, otherwise build from scene data
    const prompt = body.customPrompt || buildScenePrompt(body.scene, body.styleContext)

    logger.info(
      {
        sceneNumber: body.scene.sceneNumber,
        userId: session.user.id,
        briefId: body.briefId,
        hasRefImages: !!referenceImages?.length,
      },
      'Regenerating single scene image'
    )

    const result = await generateSceneImage(prompt, {
      size: '1536x1024',
      referenceImages,
    })

    // Upload to Supabase
    const buffer = Buffer.from(result.base64, 'base64')
    const path = `${body.briefId}/scene-${body.scene.sceneNumber}-${Date.now()}.webp`
    const imageUrl = await uploadToStorage('storyboard-images', path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

    return successResponse({ imageUrl, sceneNumber: body.scene.sceneNumber })
  })
}
