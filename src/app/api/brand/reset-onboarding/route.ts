import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Get user with company info
      const [currentUser] = await db
        .select({
          companyId: users.companyId,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!currentUser) {
        throw Errors.notFound('User')
      }

      // Delete the company if it exists
      if (currentUser.companyId) {
        await db.delete(companies).where(eq(companies.id, currentUser.companyId))
      }

      // Reset user onboarding status and role to CLIENT
      // Role must be reset to CLIENT so user can complete onboarding again
      await db
        .update(users)
        .set({
          companyId: null,
          onboardingCompleted: false,
          onboardingData: null,
          role: 'CLIENT',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/brand/reset-onboarding' }
  )
}
