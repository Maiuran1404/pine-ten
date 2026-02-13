import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    // Get user with company data
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        company: true,
      },
    })

    if (!user) {
      throw Errors.notFound('User')
    }

    return successResponse({
      company: user.company || null,
    })
  })
}
