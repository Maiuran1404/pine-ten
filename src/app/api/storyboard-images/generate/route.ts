import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { buildScenePrompt, generateSceneImage } from '@/lib/ai/image-generation'
import { uploadToStorage } from '@/lib/storage'
import { fetchReferenceImagesAsBase64 } from '@/lib/ai/reference-image-utils'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const maxDuration = 120

const sceneSchema = z.object({
  sceneNumber: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  visualNote: z.string().optional(),
  cameraNote: z.string().optional(),
  voiceover: z.string().optional(),
  transition: z.string().optional(),
  imageGenerationPrompt: z.string().optional(),
})

const generateSchema = z.object({
  scenes: z.array(sceneSchema).min(1).max(12),
  styleContext: z.string().max(2000),
  briefId: z.string().min(1),
  styleIds: z.array(z.string().uuid()).max(5).optional(),
})

/** Concurrency-limited parallel execution */
async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  let index = 0

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++
      try {
        const value = await tasks[currentIndex]()
        results[currentIndex] = { status: 'fulfilled', value }
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext())
  await Promise.all(workers)
  return results
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = generateSchema.parse(await request.json())

    // Fetch reference images from selected styles (if any)
    let referenceImages: Array<{ base64: string; mimeType: string }> | undefined
    if (body.styleIds && body.styleIds.length > 0) {
      const styles = await db
        .select({ styleReferenceImages: deliverableStyleReferences.styleReferenceImages })
        .from(deliverableStyleReferences)
        .where(inArray(deliverableStyleReferences.id, body.styleIds))

      // Collect all reference image URLs (deduplicated, max 10)
      const allUrls = [...new Set(styles.flatMap((s) => s.styleReferenceImages ?? []))]
      if (allUrls.length > 0) {
        referenceImages = await fetchReferenceImagesAsBase64(allUrls, 10)
        logger.info(
          { refImageCount: referenceImages.length },
          'Fetched style reference images for storyboard'
        )
      }
    }

    const tasks = body.scenes.map((scene) => async () => {
      const prompt = buildScenePrompt(scene, body.styleContext)
      const result = await generateSceneImage(prompt, {
        size: '1536x1024',
        quality: 'low',
        referenceImages,
      })

      // Upload to Supabase
      const buffer = Buffer.from(result.base64, 'base64')
      const path = `${body.briefId}/scene-${scene.sceneNumber}-${Date.now()}.webp`
      const imageUrl = await uploadToStorage('storyboard-images', path, buffer, {
        contentType: 'image/webp',
        upsert: true,
      })

      return { sceneNumber: scene.sceneNumber, imageUrl }
    })

    logger.info(
      {
        sceneCount: body.scenes.length,
        userId: session.user.id,
        briefId: body.briefId,
        hasRefImages: !!referenceImages?.length,
      },
      'Starting batch Gemini generation'
    )

    // Run with concurrency limit of 3
    const settled = await parallelWithLimit(tasks, 3)

    const results = settled.map((result, i) => {
      if (result.status === 'fulfilled') {
        return {
          sceneNumber: result.value.sceneNumber,
          imageUrl: result.value.imageUrl,
          status: 'success' as const,
        }
      }
      logger.error(
        { sceneNumber: body.scenes[i].sceneNumber, err: result.reason },
        'Gemini generation failed for scene'
      )
      return {
        sceneNumber: body.scenes[i].sceneNumber,
        imageUrl: null,
        status: 'error' as const,
      }
    })

    const successCount = results.filter((r) => r.status === 'success').length
    logger.info(
      { successCount, totalCount: results.length, briefId: body.briefId },
      'Batch Gemini generation complete'
    )

    if (successCount === 0) {
      throw Errors.badRequest('All image generations failed')
    }

    return successResponse({ results })
  })
}
