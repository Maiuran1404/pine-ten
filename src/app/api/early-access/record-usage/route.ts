import { NextRequest } from 'next/server'
import { eq, and, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { earlyAccessCodes, earlyAccessCodeUsages } from '@/db'
import { withTransaction } from '@/db'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { validateEarlyAccessCodeSchema } from '@/lib/validations'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw Errors.unauthorized()

    const body = validateEarlyAccessCodeSchema.parse(await request.json())

    await withTransaction(async (tx) => {
      // Find the code
      const [code] = await tx
        .select()
        .from(earlyAccessCodes)
        .where(and(eq(earlyAccessCodes.code, body.code), eq(earlyAccessCodes.isActive, true)))
        .limit(1)

      if (!code) {
        throw Errors.badRequest('Invalid invite code')
      }

      // Record usage
      await tx.insert(earlyAccessCodeUsages).values({
        codeId: code.id,
        userId: session.user.id,
      })

      // Increment used_count
      await tx
        .update(earlyAccessCodes)
        .set({ usedCount: sql`${earlyAccessCodes.usedCount} + 1` })
        .where(eq(earlyAccessCodes.id, code.id))
    })

    return successResponse({ recorded: true })
  })
}
