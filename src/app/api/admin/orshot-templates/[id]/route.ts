import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { orshotTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { updateOrshotTemplateSchema } from '@/lib/validations'

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
      const validated = updateOrshotTemplateSchema.parse(await request.json())

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

      if (validated.name !== undefined) updateData.name = validated.name
      if (validated.description !== undefined) updateData.description = validated.description
      if (validated.category !== undefined) updateData.category = validated.category
      if (validated.orshotTemplateId !== undefined)
        updateData.orshotTemplateId = validated.orshotTemplateId
      if (validated.previewImageUrl !== undefined)
        updateData.previewImageUrl = validated.previewImageUrl
      if (validated.parameterMapping !== undefined)
        updateData.parameterMapping = validated.parameterMapping
      if (validated.outputFormat !== undefined) updateData.outputFormat = validated.outputFormat
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive

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
