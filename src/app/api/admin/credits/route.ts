import { NextRequest } from 'next/server'
import { withTransaction } from '@/db'
import { users, creditTransactions } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { sendEmail, emailTemplates } from '@/lib/notifications'
import { config } from '@/lib/config'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { adminCreditsSchema } from '@/lib/validations'

// POST - Manually grant/adjust credits for a user (admin only)
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { userId, amount, type, description } = adminCreditsSchema.parse(body)

      // SECURITY: Use transaction with row lock to prevent race conditions
      const result = await withTransaction(async (tx) => {
        // Lock the user row to prevent concurrent modifications
        const [user] = await tx
          .select({ credits: users.credits, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, userId))
          .for('update')

        if (!user) {
          throw Errors.notFound('User')
        }

        const currentCredits = user.credits
        const newCredits = currentCredits + amount

        // Prevent negative credit balance
        if (newCredits < 0) {
          throw Errors.badRequest('Operation would result in negative credit balance')
        }

        // Atomically update credits and log transaction
        await tx
          .update(users)
          .set({
            credits: sql`${users.credits} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))

        await tx.insert(creditTransactions).values({
          userId,
          amount,
          type: type === 'BONUS' ? 'ADMIN_GRANT' : type,
          description: description || `Admin ${type.toLowerCase()}: ${amount} credits`,
        })

        return {
          currentCredits,
          newCredits,
          userEmail: user.email,
          userName: user.name,
        }
      })

      // Send notification email for positive adjustments (outside transaction)
      if (amount > 0 && result.userEmail) {
        try {
          const email = emailTemplates.creditsPurchased(
            result.userName,
            amount,
            `${config.app.url}/dashboard`
          )
          await sendEmail({
            to: result.userEmail,
            subject: `You've received ${amount} credits!`,
            html: email.html.replace(
              'Thank you for your purchase!',
              description || 'Credits have been added to your account!'
            ),
          })
        } catch (emailError) {
          logger.error({ err: emailError }, 'Failed to send credit notification')
        }
      }

      logger.info(
        { userId, amount, type, newCredits: result.newCredits },
        'Credits adjusted by admin'
      )

      return successResponse({
        previousCredits: result.currentCredits,
        newCredits: result.newCredits,
        adjustment: amount,
      })
    },
    { endpoint: 'POST /api/admin/credits' }
  )
}
