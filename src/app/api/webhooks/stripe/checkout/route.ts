import { NextRequest } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const body = await request.json()
    const { packageId, returnUrl } = body

    if (!packageId) {
      throw Errors.badRequest('Package ID is required')
    }

    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email,
      packageId,
      returnUrl
    )

    return successResponse({ url: checkoutSession.url })
  })
}
