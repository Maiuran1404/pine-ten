import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { audiences, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const { id } = await params

      // Get user's company ID
      const [dbUser] = await db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!dbUser?.companyId) {
        throw Errors.notFound('Company')
      }

      // First, set all audiences for this company to not primary
      await db
        .update(audiences)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(audiences.companyId, dbUser.companyId))

      // Then set the specified audience as primary
      const result = await db
        .update(audiences)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(and(eq(audiences.id, id), eq(audiences.companyId, dbUser.companyId)))
        .returning()

      if (result.length === 0) {
        throw Errors.notFound('Audience')
      }

      return successResponse({ success: true })
    },
    { endpoint: 'PUT /api/audiences/[id]/primary' }
  )
}
