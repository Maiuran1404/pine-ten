import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { uploadToStorage } from '@/lib/storage'
import { buildStyleDirective } from '@/lib/ai/style-directive-builder'
import { logger } from '@/lib/logger'

export const maxDuration = 300

/**
 * POST /api/admin/backfill-style-cache
 *
 * Backfills `imageGenDirective` and `cachedReferenceImageUrls` for all active
 * deliverable style references. Idempotent — safe to re-run.
 *
 * For each style:
 * 1. Builds imageGenDirective from existing fields
 * 2. Downloads each styleReferenceImage URL and re-uploads to Supabase
 * 3. Updates the row with both computed fields
 */
export async function POST(_request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const styles = await db
      .select()
      .from(deliverableStyleReferences)
      .where(eq(deliverableStyleReferences.isActive, true))

    logger.info({ styleCount: styles.length }, 'Starting style cache backfill')

    let processed = 0
    let errors = 0
    const details: Array<{ id: string; name: string; status: string; cached: number }> = []

    for (const style of styles) {
      try {
        // 1. Build imageGenDirective
        const directive = buildStyleDirective({
          promptGuide: style.promptGuide,
          colorSamples: style.colorSamples,
          moodKeywords: style.moodKeywords,
          visualElements: style.visualElements,
          styleAxis: style.styleAxis,
          colorTemperature: style.colorTemperature,
          energyLevel: style.energyLevel,
          densityLevel: style.densityLevel,
        })

        // 2. Cache reference images to our Supabase bucket
        const cachedUrls: string[] = []
        const refImages = style.styleReferenceImages ?? []

        for (let i = 0; i < refImages.length; i++) {
          const url = refImages[i]
          try {
            const response = await fetch(url, {
              signal: AbortSignal.timeout(15000),
            })
            if (!response.ok) continue

            const contentType = response.headers.get('content-type') || 'image/png'
            const ext = contentType.includes('webp')
              ? 'webp'
              : contentType.includes('jpeg') || contentType.includes('jpg')
                ? 'jpg'
                : 'png'
            const buffer = Buffer.from(await response.arrayBuffer())
            const path = `${style.id}/${i}.${ext}`
            const cachedUrl = await uploadToStorage('style-references', path, buffer, {
              contentType,
              upsert: true,
            })
            cachedUrls.push(cachedUrl)
          } catch (err) {
            logger.warn(
              { styleId: style.id, url, err },
              'Failed to cache reference image during backfill'
            )
          }
        }

        // 3. Update the row
        await db
          .update(deliverableStyleReferences)
          .set({
            imageGenDirective: directive,
            cachedReferenceImageUrls: cachedUrls,
            updatedAt: new Date(),
          })
          .where(eq(deliverableStyleReferences.id, style.id))

        processed++
        details.push({
          id: style.id,
          name: style.name,
          status: 'ok',
          cached: cachedUrls.length,
        })
      } catch (err) {
        errors++
        logger.error({ styleId: style.id, err }, 'Failed to backfill style')
        details.push({
          id: style.id,
          name: style.name,
          status: 'error',
          cached: 0,
        })
      }
    }

    logger.info({ processed, errors, total: styles.length }, 'Style cache backfill complete')

    return successResponse({
      total: styles.length,
      processed,
      errors,
      details,
    })
  })
}
