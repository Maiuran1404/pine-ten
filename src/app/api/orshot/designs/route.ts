import { db } from '@/db'
import { generatedDesigns, orshotTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/orshot/designs
 * List client's generated designs
 */
export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const designs = await db
      .select({
        id: generatedDesigns.id,
        templateId: generatedDesigns.templateId,
        templateName: generatedDesigns.templateName,
        imageUrl: generatedDesigns.imageUrl,
        imageFormat: generatedDesigns.imageFormat,
        savedToAssets: generatedDesigns.savedToAssets,
        createdAt: generatedDesigns.createdAt,
        templateCategory: orshotTemplates.category,
      })
      .from(generatedDesigns)
      .leftJoin(orshotTemplates, eq(generatedDesigns.templateId, orshotTemplates.id))
      .where(eq(generatedDesigns.clientId, session.user.id))
      .orderBy(desc(generatedDesigns.createdAt))

    return successResponse({ designs })
  })
}
