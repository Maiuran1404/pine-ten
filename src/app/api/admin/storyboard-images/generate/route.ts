import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { z } from 'zod'
import { generateSceneImage } from '@/lib/ai/image-generation'

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

    const result = await generateSceneImage(body.prompt, {
      size: body.size,
      quality: body.quality,
    })

    return successResponse({
      imageUrl: `data:image/png;base64,${result.base64}`,
      format: 'base64' as const,
    })
  })
}
