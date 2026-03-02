import 'server-only'
import { createFalClient } from '@fal-ai/client'
import { logger } from '@/lib/logger'

// =============================================================================
// FAL.AI CLIENT — thin wrapper around the fal.ai SDK for image generation
// =============================================================================

let falClient: ReturnType<typeof createFalClient> | null = null

function getFalClient() {
  if (!falClient) {
    const key = process.env.FAL_KEY
    if (!key) throw new Error('FAL_KEY not configured')
    falClient = createFalClient({ credentials: key })
  }
  return falClient
}

/** Check if fal.ai is configured */
export function isFalAvailable(): boolean {
  return !!process.env.FAL_KEY
}

/**
 * Call a fal.ai endpoint with timing and error handling.
 * Returns the raw result from the fal.ai SDK.
 */
export async function falGenerate<TInput, TOutput>(
  endpointId: string,
  input: TInput
): Promise<{ data: TOutput; latencyMs: number }> {
  const client = getFalClient()
  const start = Date.now()

  logger.debug({ endpointId }, 'Calling fal.ai endpoint')

  const result = (await client.subscribe(endpointId, {
    input: input as Record<string, unknown>,
  })) as { data: TOutput }
  const latencyMs = Date.now() - start

  logger.debug({ endpointId, latencyMs }, 'fal.ai call completed')

  return { data: result.data, latencyMs }
}

/**
 * Convert a base64 image to a fal.ai-compatible data URI.
 * fal.ai accepts data URIs directly in image URL fields.
 */
export function toDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}
