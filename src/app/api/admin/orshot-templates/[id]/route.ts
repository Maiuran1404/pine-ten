import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { orshotTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/orshot-templates/[id]
 * Get a single Orshot template preset
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params

      const [template] = await db
        .select()
        .from(orshotTemplates)
        .where(eq(orshotTemplates.id, id))
        .limit(1)

      if (!template) {
        throw Errors.notFound('Template')
      }

      return successResponse({ template })
    },
    { endpoint: 'GET /api/admin/orshot-templates/[id]' }
  )
}

/**
 * PATCH /api/admin/orshot-templates/[id]
 * Update an Orshot template preset
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { id } = await params
      const body = await request.json()

      // Check if template exists
      const [existingTemplate] = await db
        .select()
        .from(orshotTemplates)
        .where(eq(orshotTemplates.id, id))
        .limit(1)

      if (!existingTemplate) {
        throw Errors.notFound('Template')
      }

      // Build update object with only provided fields
      const updateData: Partial<typeof orshotTemplates.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (body.name !== undefined) updateData.name = body.name
      if (body.description !== undefined) updateData.description = body.description
      if (body.category !== undefined) {
        const validCategories = ['social_media', 'marketing', 'brand_assets']
        if (!validCategories.includes(body.category)) {
          throw Errors.badRequest(`Category must be one of: ${validCategories.join(', ')}`)
        }
        updateData.category = body.category
      }
      if (body.orshotTemplateId !== undefined) {
        if (typeof body.orshotTemplateId !== 'number' || body.orshotTemplateId <= 0) {
          throw Errors.badRequest('orshotTemplateId must be a positive number')
        }
        updateData.orshotTemplateId = body.orshotTemplateId
      }
      if (body.previewImageUrl !== undefined) updateData.previewImageUrl = body.previewImageUrl
      if (body.parameterMapping !== undefined) updateData.parameterMapping = body.parameterMapping
      if (body.outputFormat !== undefined) {
        const validFormats = ['png', 'jpg', 'webp', 'pdf']
        if (!validFormats.includes(body.outputFormat)) {
          throw Errors.badRequest(`Output format must be one of: ${validFormats.join(', ')}`)
        }
        updateData.outputFormat = body.outputFormat
      }
      if (body.isActive !== undefined) updateData.isActive = body.isActive

      const [updatedTemplate] = await db
        .update(orshotTemplates)
        .set(updateData)
        .where(eq(orshotTemplates.id, id))
        .returning()

      return successResponse({ template: updatedTemplate })
    },
    { endpoint: 'PATCH /api/admin/orshot-templates/[id]' }
  )
}
