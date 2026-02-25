import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { z } from 'zod'

export const maxDuration = 120

const generateSchema = z.object({
  prompt: z.string().min(1).max(10000),
  size: z.enum(['1536x1024', '1024x1024', '1024x1536']).default('1536x1024'),
  quality: z.enum(['low', 'medium', 'high']).default('high'),
})

export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin()

    const body = generateSchema.parse(await request.json())

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw Errors.badRequest('OPENAI_API_KEY not configured on server')
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: body.prompt,
        size: body.size,
        quality: body.quality,
        n: 1,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const msg = errorData?.error?.message || `OpenAI API error: ${response.status}`
      throw Errors.badRequest(msg)
    }

    const data = await response.json()
    const imageData = data.data?.[0]

    if (imageData?.b64_json) {
      return successResponse({
        imageUrl: `data:image/png;base64,${imageData.b64_json}`,
        format: 'base64' as const,
      })
    }

    if (imageData?.url) {
      return successResponse({
        imageUrl: imageData.url,
        format: 'url' as const,
      })
    }

    throw Errors.badRequest('Unexpected response format from OpenAI')
  })
}
