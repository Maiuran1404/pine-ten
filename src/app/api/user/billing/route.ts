import { db } from '@/db'
import { users, creditTransactions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    // Fetch user credits
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

    // Fetch transaction history
    const transactions = await db
      .select({
        id: creditTransactions.id,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        description: creditTransactions.description,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, session.user.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50)

    return successResponse({
      credits: userResult[0].credits,
      transactions,
    })
  })
}
