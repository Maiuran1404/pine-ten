import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { generateSceneImage } from '@/lib/ai/dalle-image-generation'
import { stylePreviewSchema } from '@/lib/validations'
import { buildStylePreviewPrompt } from '@/lib/ai/style-prompt-builder'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/style-preview
 *
 * Generate a preview image for a style preset with a given subject.
 * Returns base64 image data — no DB save, no Supabase upload.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const body = stylePreviewSchema.parse(await request.json())
    const { subject, promptGuide, styleName, size, quality } = body

    logger.info({ styleName, subject: subject.slice(0, 50) }, 'Generating style preview')

    const prompt = buildStylePreviewPrompt(styleName, promptGuide, subject)

    const result = await generateSceneImage(prompt, { size, quality })

    logger.info({ styleName }, 'Style preview generated')

    return successResponse({ base64: result.base64, format: result.format }, 200)
  })
}
