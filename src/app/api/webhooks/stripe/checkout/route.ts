import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createCheckoutSession } from '@/lib/stripe'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

const checkoutBodySchema = z.object({
  packageId: z.string().min(1),
  returnUrl: z
    .string()
    .optional()
    .refine((v) => !v || (v.startsWith('/') && !v.startsWith('//')), {
      message: 'returnUrl must be a relative path',
    }),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const { packageId, returnUrl } = checkoutBodySchema.parse(await request.json())

    // Use the request origin so Stripe redirects back to the correct subdomain
    // (e.g. app.localhost:3000 in dev, app.getcrafted.ai in prod)
    const origin = request.headers.get('origin') || request.nextUrl.origin

    const checkoutSession = await createCheckoutSession(
      session.user.id,
      session.user.email,
      packageId,
      returnUrl,
      origin
    )

    return successResponse({ url: checkoutSession.url })
  })
}
