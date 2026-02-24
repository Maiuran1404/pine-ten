import 'server-only'
import { logger } from '@/lib/logger'

interface EmbeddingResult {
  vector: number[]
  model: string
  dimensions: number
}

/**
 * Generate CLIP image embedding from a URL using Replicate API.
 * Uses openai/clip-vit-large-patch14 which produces 512-dimensional vectors.
 */
export async function generateImageEmbedding(imageUrl: string): Promise<EmbeddingResult | null> {
  const apiKey = process.env.CLIP_API_KEY
  const apiUrl = process.env.CLIP_API_URL || 'https://api.replicate.com/v1/predictions'

  if (!apiKey) {
    logger.warn('CLIP_API_KEY not configured, skipping embedding generation')
    return null
  }

  try {
    // Create prediction
    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'openai/clip-vit-large-patch14',
        input: {
          image: imageUrl,
        },
      }),
    })

    if (!createResponse.ok) {
      throw new Error(`Replicate API returned ${createResponse.status}`)
    }

    const prediction = (await createResponse.json()) as {
      status: string
      error?: string
      output?: number[]
      urls: { get: string }
    }

    // Poll for completion (max 30 seconds)
    let result = prediction
    const maxAttempts = 15
    for (let i = 0; i < maxAttempts; i++) {
      if (result.status === 'succeeded') break
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Prediction ${result.status}: ${result.error || 'unknown error'}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))

      const pollResponse = await fetch(result.urls.get, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      result = (await pollResponse.json()) as typeof prediction
    }

    if (result.status !== 'succeeded') {
      throw new Error('Prediction timed out')
    }

    const vector = result.output as number[]
    return {
      vector,
      model: 'clip-vit-large-patch14',
      dimensions: vector.length,
    }
  } catch (error) {
    logger.error({ err: error, imageUrl }, 'Failed to generate CLIP embedding')
    return null
  }
}

/**
 * Generate embeddings for multiple images in batch with rate limiting.
 */
export async function generateBatchEmbeddings(
  images: Array<{ id: string; imageUrl: string }>,
  concurrency: number = 3,
  delayMs: number = 1000
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>()

  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(async ({ id, imageUrl }) => {
        const result = await generateImageEmbedding(imageUrl)
        if (result) {
          results.set(id, result.vector)
        }
        return { id, result }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'rejected') {
        logger.warn({ error: result.reason }, 'Batch embedding failed for an image')
      }
    }

    // Rate limit delay between batches
    if (i + concurrency < images.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
