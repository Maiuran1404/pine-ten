import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { platformSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_IMAGE_PIPELINE_CONFIG } from '@/lib/ai/image-pipeline-config'

const IMAGE_PIPELINE_CONFIG_KEY = 'image_pipeline_config'

/**
 * GET /api/admin/image-pipeline
 *
 * Returns the stored config and the hardcoded defaults separately.
 * Frontend uses defaults for "Reset" functionality.
 */
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const result = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, IMAGE_PIPELINE_CONFIG_KEY))
        .limit(1)

      return successResponse({
        config: result.length > 0 ? result[0].value : null,
        defaults: DEFAULT_IMAGE_PIPELINE_CONFIG,
      })
    },
    { endpoint: 'GET /api/admin/image-pipeline' }
  )
}

/**
 * POST /api/admin/image-pipeline
 *
 * Upserts the image pipeline config into platformSettings.
 * Accepts a partial config — the loader deep-merges with defaults at runtime.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { config } = body

      if (!config || typeof config !== 'object') {
        throw Errors.badRequest('Config object is required')
      }

      // Upsert the config
      const existing = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, IMAGE_PIPELINE_CONFIG_KEY))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(platformSettings)
          .set({
            value: config,
            description:
              'Image pipeline configuration (prompts, vocabulary, providers, execution limits)',
            updatedAt: new Date(),
          })
          .where(eq(platformSettings.key, IMAGE_PIPELINE_CONFIG_KEY))
      } else {
        await db.insert(platformSettings).values({
          key: IMAGE_PIPELINE_CONFIG_KEY,
          value: config,
          description:
            'Image pipeline configuration (prompts, vocabulary, providers, execution limits)',
        })
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/admin/image-pipeline' }
  )
}
