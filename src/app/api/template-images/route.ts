import { requireAuth } from '@/lib/require-auth'
import { withErrorHandling } from '@/lib/errors'
import { cachedSuccessResponse, CacheDurations } from '@/lib/cache'
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

      return cachedSuccessResponse({ images }, CacheDurations.LONG)
    },
    { endpoint: 'GET /api/template-images' }
  )
}
