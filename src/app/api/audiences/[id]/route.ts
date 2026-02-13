import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { audiences, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

      // Delete the audience (only if it belongs to user's company)
      const result = await db
        .delete(audiences)
        .where(and(eq(audiences.id, id), eq(audiences.companyId, dbUser.companyId)))
        .returning()

      if (result.length === 0) {
        throw Errors.notFound('Audience')
      }

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/audiences/[id]' }
  )
}
