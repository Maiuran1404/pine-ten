import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { audiences, users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Get user's company ID
      const [dbUser] = await db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!dbUser?.companyId) {
        return successResponse({ audiences: [] })
      }

      // Get audiences for the company, sorted by primary first then confidence descending
      const companyAudiences = await db
        .select()
        .from(audiences)
        .where(eq(audiences.companyId, dbUser.companyId))

      // Sort so primary is first, then by confidence descending
      const sortedAudiences = companyAudiences.sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1
        if (!a.isPrimary && b.isPrimary) return 1
        return b.confidence - a.confidence
      })

      return successResponse({ audiences: sortedAudiences })
    },
    { endpoint: 'GET /api/audiences' }
  )
}
