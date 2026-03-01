import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireRole } from '@/lib/require-auth'
import { db } from '@/db'
import { users, companies } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  return withErrorHandling(
    async () => {
      const { user } = await requireRole('CLIENT', 'ADMIN')

      const companyId = user.companyId

      // Run user update and company delete in parallel
      // User update nulls out companyId so no FK issues
      await Promise.all([
        db
          .update(users)
          .set({
            companyId: null,
            onboardingCompleted: false,
            onboardingData: { isRedo: true, resetAt: new Date().toISOString() },
            role: 'CLIENT',
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id)),
        ...(companyId ? [db.delete(companies).where(eq(companies.id, companyId))] : []),
      ])

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/brand/reset-onboarding' }
  )
}
