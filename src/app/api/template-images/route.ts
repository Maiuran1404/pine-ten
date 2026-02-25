import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db } from '@/db'
import { templateImages } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const images = await db
        .select()
        .from(templateImages)
        .where(eq(templateImages.isActive, true))
        .orderBy(templateImages.categoryKey, templateImages.displayOrder)

      return successResponse({ images })
    },
    { endpoint: 'GET /api/template-images' }
  )
}
