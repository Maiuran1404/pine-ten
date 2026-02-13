import { db } from '@/db'
import { orshotTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/orshot/templates
 * List available Orshot templates for clients (only active ones)
 */
export async function GET() {
  return withErrorHandling(async () => {
    await requireAuth()

    const templates = await db
      .select({
        id: orshotTemplates.id,
        name: orshotTemplates.name,
        description: orshotTemplates.description,
        category: orshotTemplates.category,
        previewImageUrl: orshotTemplates.previewImageUrl,
        outputFormat: orshotTemplates.outputFormat,
      })
      .from(orshotTemplates)
      .where(eq(orshotTemplates.isActive, true))
      .orderBy(desc(orshotTemplates.createdAt))

    return successResponse({ templates })
  })
}
