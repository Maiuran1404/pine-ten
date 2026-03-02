import 'server-only'
import { logger } from '@/lib/logger'

/**
 * Fetch a single URL with retry and timeout.
 * Returns null on failure instead of throwing.
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 2,
  timeoutMs: number = 10000
): Promise<{ base64: string; mimeType: string } | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) {
        logger.warn({ url, status: response.status, attempt }, 'Failed to fetch reference image')
        continue
      }

      const contentType = response.headers.get('content-type') || 'image/png'
      const mimeType = contentType.split(';')[0].trim()
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      return { base64, mimeType }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      logger.warn(
        { url, attempt, timeout: isAbort, err: isAbort ? 'Request timed out' : err },
        `Reference image fetch ${isAbort ? 'timed out' : 'failed'} (attempt ${attempt}/${maxRetries})`
      )
    }
  }

  return null
}

/**
 * Download reference images from URLs and convert to base64 for multimodal input.
 * Uses retry + timeout per URL. Reports requested vs fetched count.
 */
export async function fetchReferenceImagesAsBase64(
  urls: string[],
  maxImages: number = 10
): Promise<Array<{ base64: string; mimeType: string }>> {
  const limited = urls.slice(0, maxImages)

  const fetched = await Promise.all(limited.map((url) => fetchWithRetry(url)))
  const results = fetched.filter((r): r is { base64: string; mimeType: string } => r !== null)

  if (results.length < limited.length) {
    logger.warn(
      {
        requested: limited.length,
        fetched: results.length,
        failed: limited.length - results.length,
      },
      'Some reference images could not be fetched — generation will proceed with available images'
    )
  }

  return results
}
