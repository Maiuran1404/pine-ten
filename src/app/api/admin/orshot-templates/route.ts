import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { orshotTemplates } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { createOrshotTemplateSchema } from '@/lib/validations'

/**
 * GET /api/admin/orshot-templates
 * List all Orshot template presets
 */
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const templates = await db
        .select()
        .from(orshotTemplates)
        .orderBy(desc(orshotTemplates.createdAt))

      return successResponse({ templates })
    },
    { endpoint: 'GET /api/admin/orshot-templates' }
  )
}

/**
 * POST /api/admin/orshot-templates
 * Create a new Orshot template preset
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const {
        name,
        description,
        category,
        orshotTemplateId,
        previewImageUrl,
        parameterMapping,
        outputFormat,
      } = createOrshotTemplateSchema.parse(await request.json())

      const [newTemplate] = await db
        .insert(orshotTemplates)
        .values({
          name,
          description: description || null,
          category,
          orshotTemplateId,
          previewImageUrl: previewImageUrl || null,
          parameterMapping,
          outputFormat: outputFormat || 'png',
          isActive: true,
        })
        .returning()

      return successResponse({ template: newTemplate }, 201)
    },
    { endpoint: 'POST /api/admin/orshot-templates' }
  )
}

/**
 * DELETE /api/admin/orshot-templates?id={id}
 * Delete an Orshot template preset
 */
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        throw Errors.badRequest('Template ID is required')
      }

      await db.delete(orshotTemplates).where(eq(orshotTemplates.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/orshot-templates' }
  )
}
