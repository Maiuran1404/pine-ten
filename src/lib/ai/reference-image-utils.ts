import 'server-only'
import { logger } from '@/lib/logger'

/**
 * Download reference images from URLs and convert to base64 for Gemini multimodal input.
 * Silently skips images that fail to download.
 */
export async function fetchReferenceImagesAsBase64(
  urls: string[],
  maxImages: number = 10
): Promise<Array<{ base64: string; mimeType: string }>> {
  const limited = urls.slice(0, maxImages)
  const results: Array<{ base64: string; mimeType: string }> = []

  await Promise.all(
    limited.map(async (url) => {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          logger.warn({ url, status: response.status }, 'Failed to fetch reference image')
          return
        }

        const contentType = response.headers.get('content-type') || 'image/png'
        const mimeType = contentType.split(';')[0].trim()
        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')

        results.push({ base64, mimeType })
      } catch (err) {
        logger.warn({ url, err }, 'Error fetching reference image')
      }
    })
  )

  return results
}
