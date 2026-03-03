import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
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
  customPrompt: z.string().max(8000).optional(),
  styleIds: z.array(z.string().uuid()).max(5).optional(),
  /** URL of the hero frame image for consistency-anchored regeneration */
  heroImageUrl: z.string().url().optional(),
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

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()
    const body = regenerateSchema.parse(await request.json())

    // ─── Load pipeline config from DB (merged with defaults) ──────
    const pipelineConfig = await loadImagePipelineConfig()

    // ─── Fetch rich style metadata ───────────────────────────────
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

      const cachedUrls = styles.flatMap((s) => s.cachedReferenceImageUrls ?? [])
      const originalUrls = styles.flatMap((s) => s.styleReferenceImages ?? [])
      const allUrls = [...new Set(cachedUrls.length > 0 ? cachedUrls : originalUrls)]

      if (allUrls.length > 0) {
        referenceImages = await fetchReferenceImagesAsBase64(allUrls, 9)
        logger.info(
          { refImageCount: referenceImages.length },
          'Fetched style reference images for scene regeneration'
        )
      }
    }

    const brandContext: BrandContextForPrompt | undefined = body.brandContext

    // ─── Fetch hero frame as anchor image (if provided) ──────────
    let anchorImage: { base64: string; mimeType: string } | undefined
    if (body.heroImageUrl) {
      try {
        const response = await fetch(body.heroImageUrl)
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/png'
          const mimeType = contentType.split(';')[0].trim()
          const buffer = await response.arrayBuffer()
          anchorImage = { base64: Buffer.from(buffer).toString('base64'), mimeType }
          logger.debug('Fetched hero frame as anchor for consistency regeneration')
        }
      } catch (err) {
        logger.warn(
          { err, heroImageUrl: body.heroImageUrl },
          'Failed to fetch hero frame for anchor'
        )
      }
    }

    // ─── Build prompt ────────────────────────────────────────────
    let prompt: string
    if (body.customPrompt) {
      prompt = body.customPrompt
    } else if (styleMetadata) {
      prompt = buildScenePrompt(body.scene, styleMetadata, brandContext, undefined, pipelineConfig)
    } else {
      prompt = buildScenePrompt(body.scene, body.styleContext, undefined, undefined, pipelineConfig)
    }

    logger.info(
      {
        sceneNumber: body.scene.sceneNumber,
        userId: session.user.id,
        briefId: body.briefId,
        hasRefImages: !!referenceImages?.length,
        hasAnchor: !!anchorImage,
        hasStyleMetadata: !!styleMetadata,
      },
      'Regenerating single scene image'
    )

    // ─── Generate ────────────────────────────────────────────────
    const result = await generateSceneImage(prompt, {
      size: pipelineConfig.executionLimits.imageSize,
      referenceImages: anchorImage ? undefined : referenceImages,
      anchorImage,
      strategy: anchorImage ? 'consistency' : referenceImages ? 'hero' : 'standard',
      config: pipelineConfig,
    })

    // Upload with correct content type
    const ext = result.format === 'webp' ? 'webp' : result.format === 'jpeg' ? 'jpg' : 'png'
    const mime =
      result.format === 'webp'
        ? 'image/webp'
        : result.format === 'jpeg'
          ? 'image/jpeg'
          : 'image/png'
    const buffer = Buffer.from(result.base64, 'base64')
    const path = `${body.briefId}/scene-${body.scene.sceneNumber}-${Date.now()}.${ext}`
    const imageUrl = await uploadToStorage('storyboard-images', path, buffer, {
      contentType: mime,
      upsert: true,
    })

    return successResponse({ imageUrl, sceneNumber: body.scene.sceneNumber })
  })
}
