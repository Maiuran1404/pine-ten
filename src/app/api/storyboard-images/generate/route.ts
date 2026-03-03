import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { buildScenePrompt } from '@/lib/ai/scene-prompt-builder'
import { generateSceneImage } from '@/lib/ai/image-generation'
import { loadImagePipelineConfig } from '@/lib/ai/image-pipeline-config'
import type { StyleMetadata, BrandContextForPrompt } from '@/lib/ai/image-providers/types'
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
  brandContext: z
    .object({
      colors: z
        .object({
          primary: z.string().optional(),
          secondary: z.string().optional(),
          accent: z.string().optional(),
        })
        .optional(),
      industry: z.string().optional(),
      toneOfVoice: z.string().optional(),
      brandDescription: z.string().optional(),
    })
    .optional(),
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

/** Map format to MIME type */
function formatToMime(format: string): string {
  switch (format) {
    case 'webp':
      return 'image/webp'
    case 'jpeg':
      return 'image/jpeg'
    default:
      return 'image/png'
  }
}

/** Map format to file extension */
function formatToExt(format: string): string {
  switch (format) {
    case 'webp':
      return 'webp'
    case 'jpeg':
      return 'jpg'
    default:
      return 'png'
  }
}

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = generateSchema.parse(await request.json())

    // ─── Load pipeline config from DB (merged with defaults) ──────
    const pipelineConfig = await loadImagePipelineConfig()

    // ─── Step 1: Fetch ALL rich style metadata ─────────────────────
    let styleMetadata: StyleMetadata | undefined
    let referenceImages: Array<{ base64: string; mimeType: string }> | undefined

    if (body.styleIds && body.styleIds.length > 0) {
      const styles = await db
        .select({
          promptGuide: deliverableStyleReferences.promptGuide,
          colorSamples: deliverableStyleReferences.colorSamples,
          moodKeywords: deliverableStyleReferences.moodKeywords,
          visualElements: deliverableStyleReferences.visualElements,
          styleAxis: deliverableStyleReferences.styleAxis,
          colorTemperature: deliverableStyleReferences.colorTemperature,
          energyLevel: deliverableStyleReferences.energyLevel,
          densityLevel: deliverableStyleReferences.densityLevel,
          styleReferenceImages: deliverableStyleReferences.styleReferenceImages,
          cachedReferenceImageUrls: deliverableStyleReferences.cachedReferenceImageUrls,
        })
        .from(deliverableStyleReferences)
        .where(inArray(deliverableStyleReferences.id, body.styleIds))

      // Build rich StyleMetadata from aggregated style data
      styleMetadata = {
        promptGuides: styles.map((s) => s.promptGuide).filter(Boolean) as string[],
        colorPalette: [...new Set(styles.flatMap((s) => s.colorSamples ?? []))],
        moodKeywords: [...new Set(styles.flatMap((s) => s.moodKeywords ?? []))],
        visualElements: [...new Set(styles.flatMap((s) => s.visualElements ?? []))],
        styleAxes: [...new Set(styles.map((s) => s.styleAxis).filter(Boolean))],
        colorTemperature: styles[0]?.colorTemperature ?? undefined,
        energyLevel: styles[0]?.energyLevel ?? undefined,
        densityLevel: styles[0]?.densityLevel ?? undefined,
      }

      // Prefer cached reference URLs, fall back to original URLs
      const cachedUrls = styles.flatMap((s) => s.cachedReferenceImageUrls ?? [])
      const originalUrls = styles.flatMap((s) => s.styleReferenceImages ?? [])
      const allUrls = [...new Set(cachedUrls.length > 0 ? cachedUrls : originalUrls)]

      if (allUrls.length > 0) {
        referenceImages = await fetchReferenceImagesAsBase64(allUrls, 4) // Cap at 4 to avoid overwhelming scene content with style
        logger.info(
          { refImageCount: referenceImages.length, cached: cachedUrls.length > 0 },
          'Fetched style reference images for storyboard'
        )
      }
    }

    const brandContext: BrandContextForPrompt | undefined = body.brandContext

    // ─── Step 2: Hero-first-then-parallel generation ─────────────
    const totalScenes = body.scenes.length
    const sortedScenes = [...body.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber)

    logger.info(
      {
        sceneCount: totalScenes,
        userId: session.user.id,
        briefId: body.briefId,
        hasRefImages: !!referenceImages?.length,
        hasStyleMetadata: !!styleMetadata,
        hasBrandContext: !!brandContext,
      },
      'Starting hero-first batch scene image generation'
    )

    // Generate hero frame (scene 1) first
    const heroScene = sortedScenes[0]
    const heroPrompt = styleMetadata
      ? buildScenePrompt(
          heroScene,
          styleMetadata,
          brandContext,
          {
            totalScenes,
            sceneIndex: 0,
            isHeroFrame: true,
          },
          pipelineConfig
        )
      : buildScenePrompt(
          heroScene,
          body.styleContext,
          undefined,
          {
            totalScenes,
            sceneIndex: 0,
          },
          pipelineConfig
        )

    let heroResult: {
      sceneNumber: number
      imageUrl: string | null
      status: 'success' | 'error'
      error?: string
    }
    let anchorImage: { base64: string; mimeType: string } | undefined

    try {
      const result = await generateSceneImage(heroPrompt, {
        size: pipelineConfig.executionLimits.imageSize,
        referenceImages,
        strategy: 'hero',
        config: pipelineConfig,
      })

      // Upload hero frame immediately
      const buffer = Buffer.from(result.base64, 'base64')
      const ext = formatToExt(result.format)
      const mime = formatToMime(result.format)
      const path = `${body.briefId}/scene-${heroScene.sceneNumber}-${Date.now()}.${ext}`
      const imageUrl = await uploadToStorage('storyboard-images', path, buffer, {
        contentType: mime,
        upsert: true,
      })

      heroResult = { sceneNumber: heroScene.sceneNumber, imageUrl, status: 'success' }

      // Keep hero as anchor for remaining scenes
      anchorImage = { base64: result.base64, mimeType: mime }

      logger.info(
        {
          sceneNumber: heroScene.sceneNumber,
          provider: result.provider,
          latencyMs: result.latencyMs,
        },
        'Hero frame generated successfully'
      )
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error(
        { sceneNumber: heroScene.sceneNumber, error: errMsg },
        'Hero frame generation failed'
      )
      heroResult = {
        sceneNumber: heroScene.sceneNumber,
        imageUrl: null,
        status: 'error',
        error: errMsg,
      }
    }

    // If hero failed and we have more than 1 scene, fail the entire batch
    if (heroResult.status === 'error' && totalScenes > 1) {
      throw Errors.badRequest(
        `Hero frame (scene ${heroScene.sceneNumber}) generation failed: ${heroResult.error}. Cannot generate consistency-anchored remaining scenes.`
      )
    }

    // Generate remaining scenes in parallel with hero as anchor
    const remainingScenes = sortedScenes.slice(1)
    const results: (typeof heroResult)[] = [heroResult]

    if (remainingScenes.length > 0) {
      const tasks = remainingScenes.map((scene, i) => async () => {
        const sceneIndex = i + 1 // +1 because hero is index 0
        const prompt = styleMetadata
          ? buildScenePrompt(
              scene,
              styleMetadata,
              brandContext,
              {
                totalScenes,
                sceneIndex,
                isHeroFrame: false,
              },
              pipelineConfig
            )
          : buildScenePrompt(
              scene,
              body.styleContext,
              undefined,
              { totalScenes, sceneIndex },
              pipelineConfig
            )

        // Cap style refs to 1 for consistency scenes — the hero anchor image is
        // prepended by FLUX.2 Pro, so total refs = hero + 1 style = 2.
        // Too many references dilute the consistency signal from the hero frame.
        const consistencyRefs = anchorImage ? referenceImages?.slice(0, 1) : referenceImages

        const result = await generateSceneImage(prompt, {
          size: pipelineConfig.executionLimits.imageSize,
          referenceImages: consistencyRefs,
          anchorImage,
          strategy: anchorImage ? 'consistency' : 'standard',
          config: pipelineConfig,
        })

        // Upload to Supabase with correct content type
        const buffer = Buffer.from(result.base64, 'base64')
        const ext = formatToExt(result.format)
        const mime = formatToMime(result.format)
        const path = `${body.briefId}/scene-${scene.sceneNumber}-${Date.now()}.${ext}`
        const imageUrl = await uploadToStorage('storyboard-images', path, buffer, {
          contentType: mime,
          upsert: true,
        })

        return { sceneNumber: scene.sceneNumber, imageUrl }
      })

      // Run with configurable concurrency limit
      const settled = await parallelWithLimit(
        tasks,
        pipelineConfig.executionLimits.concurrencyLimit
      )

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i]
        if (result.status === 'fulfilled') {
          results.push({
            sceneNumber: result.value.sceneNumber,
            imageUrl: result.value.imageUrl,
            status: 'success',
          })
        } else {
          const errMsg =
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          logger.error(
            { sceneNumber: remainingScenes[i].sceneNumber, err: errMsg },
            'Image generation failed for scene'
          )
          results.push({
            sceneNumber: remainingScenes[i].sceneNumber,
            imageUrl: null,
            status: 'error',
            error: errMsg,
          })
        }
      }
    }

    // Sort results by scene number for consistent ordering
    results.sort((a, b) => a.sceneNumber - b.sceneNumber)

    const successCount = results.filter((r) => r.status === 'success').length
    logger.info(
      { successCount, totalCount: results.length, briefId: body.briefId },
      'Hero-first batch scene image generation complete'
    )

    if (successCount === 0) {
      throw Errors.badRequest('All image generations failed')
    }

    return successResponse({ results })
  })
}
