import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { saveStylePreviewSchema } from '@/lib/validations'
import { uploadToStorage } from '@/lib/storage'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

const BUCKET = 'deliverable-styles'

/**
 * POST /api/admin/style-preview/save
 *
 * Save a generated preview image as the style's reference image.
 * Uploads to Supabase and updates the DB record.
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const body = saveStylePreviewSchema.parse(await request.json())
    const { styleId, base64 } = body

    // Verify style exists
    const [style] = await db
      .select({ id: deliverableStyleReferences.id })
      .from(deliverableStyleReferences)
      .where(eq(deliverableStyleReferences.id, styleId))
      .limit(1)

    if (!style) {
      throw Errors.notFound('Style')
    }

    logger.info({ styleId }, 'Saving style preview as reference image')

    // Upload to Supabase storage
    const buffer = Buffer.from(base64, 'base64')
    const storagePath = `generated/${styleId}.png`
    const publicUrl = await uploadToStorage(BUCKET, storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    })

    // Update DB record with new image URL
    await db
      .update(deliverableStyleReferences)
      .set({ imageUrl: publicUrl, updatedAt: new Date() })
      .where(eq(deliverableStyleReferences.id, styleId))

    logger.info({ styleId, imageUrl: publicUrl }, 'Style preview saved as reference')

    return successResponse({ imageUrl: publicUrl }, 200)
  })
}
