import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { uploadToStorage } from '@/lib/storage'
import { getAdminStorageClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const BUCKET = 'deliverable-styles'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/admin/deliverable-styles/[id]/reference-images
 *
 * Upload one or more reference images for a style preset.
 * Accepts multipart/form-data with image files.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    await requireAdmin()
    const { id: styleId } = await params

    // Verify style exists
    const [style] = await db
      .select({
        id: deliverableStyleReferences.id,
        styleReferenceImages: deliverableStyleReferences.styleReferenceImages,
      })
      .from(deliverableStyleReferences)
      .where(eq(deliverableStyleReferences.id, styleId))
      .limit(1)

    if (!style) {
      throw Errors.notFound('Style preset')
    }

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (files.length === 0) {
      throw Errors.badRequest('No files provided')
    }

    const uploadedUrls: string[] = []

    for (const file of files) {
      if (!(file instanceof File)) continue

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw Errors.badRequest(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP`)
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw Errors.badRequest(`File too large: ${file.name}. Maximum size: 10MB`)
      }

      const timestamp = Date.now()
      const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
      const storagePath = `references/${styleId}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())
      const publicUrl = await uploadToStorage(BUCKET, storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

      uploadedUrls.push(publicUrl)
      logger.info({ styleId, path: storagePath }, 'Uploaded reference image')
    }

    // Append to existing array
    const currentImages = style.styleReferenceImages ?? []
    const updatedImages = [...currentImages, ...uploadedUrls]

    await db
      .update(deliverableStyleReferences)
      .set({ styleReferenceImages: updatedImages, updatedAt: new Date() })
      .where(eq(deliverableStyleReferences.id, styleId))

    logger.info(
      { styleId, count: uploadedUrls.length, total: updatedImages.length },
      'Reference images added'
    )

    return successResponse({ styleReferenceImages: updatedImages }, 200)
  })
}

const deleteSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
})

/**
 * DELETE /api/admin/deliverable-styles/[id]/reference-images
 *
 * Remove a reference image from a style preset.
 * Deletes from Supabase storage and removes from the DB array.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin()
    const { id: styleId } = await params

    const body = deleteSchema.parse(await request.json())
    const { imageUrl } = body

    // Verify style exists
    const [style] = await db
      .select({
        id: deliverableStyleReferences.id,
        styleReferenceImages: deliverableStyleReferences.styleReferenceImages,
      })
      .from(deliverableStyleReferences)
      .where(eq(deliverableStyleReferences.id, styleId))
      .limit(1)

    if (!style) {
      throw Errors.notFound('Style preset')
    }

    // Extract storage path from URL and delete from Supabase
    try {
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(
        /\/storage\/v1\/object\/public\/deliverable-styles\/(.+)$/
      )
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1])
        const supabase = getAdminStorageClient()
        await supabase.storage.from(BUCKET).remove([storagePath])
        logger.info({ styleId, path: storagePath }, 'Deleted reference image from storage')
      }
    } catch (err) {
      logger.warn(
        { styleId, imageUrl, err },
        'Failed to delete from storage (continuing with DB cleanup)'
      )
    }

    // Remove URL from array
    const currentImages = style.styleReferenceImages ?? []
    const updatedImages = currentImages.filter((url) => url !== imageUrl)

    await db
      .update(deliverableStyleReferences)
      .set({ styleReferenceImages: updatedImages, updatedAt: new Date() })
      .where(eq(deliverableStyleReferences.id, styleId))

    logger.info({ styleId, remaining: updatedImages.length }, 'Reference image removed')

    return successResponse({ styleReferenceImages: updatedImages }, 200)
  })
}
