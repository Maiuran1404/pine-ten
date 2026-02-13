import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const userResult = await db
      .select({
        credits: users.credits,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)

    if (!userResult.length) {
      throw Errors.notFound('User')
    }

    return successResponse({ credits: userResult[0].credits })
  })
}
