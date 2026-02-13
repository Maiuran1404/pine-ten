import { NextRequest } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, earlyAccessCodes } from '@/db'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { validateEarlyAccessCodeSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    // Rate limit: 10 attempts per minute to prevent brute-force
    const { limited } = checkRateLimit(request, 'early-access-validate', {
      window: 60,
      max: 10,
    })
    if (limited) throw Errors.rateLimited(60)

    const body = validateEarlyAccessCodeSchema.parse(await request.json())

    const [code] = await db
      .select()
      .from(earlyAccessCodes)
      .where(and(eq(earlyAccessCodes.code, body.code), eq(earlyAccessCodes.isActive, true)))
      .limit(1)

    if (!code) {
      throw Errors.badRequest('Invalid invite code')
    }

    // Check expiry
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      throw Errors.badRequest('This invite code has expired')
    }

    // Check max uses
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      throw Errors.badRequest('This invite code has reached its maximum number of uses')
    }

    return successResponse({ valid: true, code: body.code })
  })
}
