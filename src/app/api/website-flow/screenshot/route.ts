import { NextRequest } from 'next/server'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'
import { screenshotRequestSchema } from '@/lib/validations/website-flow-schemas'
import { captureScreenshot } from '@/lib/website/screenshot-service'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAuth()

      const body = await request.json()
      const validated = screenshotRequestSchema.parse(body)

      const result = await captureScreenshot({
        url: validated.url,
        fullPage: validated.fullPage,
      })

      return successResponse(
        {
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl,
          capturedAt: result.capturedAt,
        },
        201
      )
    },
    { endpoint: 'POST /api/website-flow/screenshot' }
  )
}
