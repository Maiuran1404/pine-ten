import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { withRateLimit } from '@/lib/rate-limit'
import { config } from '@/lib/config'
import { setRoleSchema } from '@/lib/validations'

// Set user role after registration based on portal type
async function handler(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const body = await request.json()
      const { role } = setRoleSchema.parse(body)

      // Only allow setting to FREELANCER from this endpoint
      // CLIENT is the default, ADMIN should never be set this way
      if (role !== 'FREELANCER') {
        throw Errors.badRequest('Invalid role')
      }

      // Check current role - only update if still CLIENT (hasn't been set already)
      const currentUser = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (currentUser.length === 0) {
        throw Errors.notFound('User')
      }

      // Only update if currently CLIENT
      if (currentUser[0].role === 'CLIENT') {
        await db
          .update(users)
          .set({ role: 'FREELANCER', updatedAt: new Date() })
          .where(eq(users.id, user.id))
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/auth/set-role' }
  )
}

// Apply auth rate limiting (20 req/min)
export const POST = withRateLimit(handler, 'auth', config.rateLimits.auth)
