import 'server-only'
import { logger } from '@/lib/logger'
import { uploadToStorage } from '@/lib/storage'

interface ScreenshotOptions {
  url: string
  viewportWidth?: number
  viewportHeight?: number
  fullPage?: boolean
  format?: 'png' | 'webp'
  quality?: number
}

interface ScreenshotResult {
  imageUrl: string
  thumbnailUrl: string | null
  capturedAt: Date
}

export async function captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const apiKey = process.env.SCREENSHOT_API_KEY
  const apiUrl = process.env.SCREENSHOT_API_URL || 'https://api.screenshotone.com/take'

  if (!apiKey) {
    // Fallback: return a placeholder when no API key configured
    logger.warn('SCREENSHOT_API_KEY not configured, using placeholder')
    return {
      imageUrl: `https://placehold.co/1280x800/f1f5f9/64748b?text=${encodeURIComponent(new URL(options.url).hostname)}`,
      thumbnailUrl: null,
      capturedAt: new Date(),
    }
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    url: options.url,
    viewport_width: String(options.viewportWidth ?? 1280),
    viewport_height: String(options.viewportHeight ?? 800),
    full_page: String(options.fullPage ?? false),
    format: options.format ?? 'webp',
    image_quality: String(options.quality ?? 80),
    delay: '3',
    block_ads: 'true',
    block_cookie_banners: 'true',
  })

  const screenshotUrl = `${apiUrl}?${params.toString()}`

  try {
    const response = await fetch(screenshotUrl)
    if (!response.ok) {
      throw new Error(`Screenshot API returned ${response.status}: ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const ext = options.format ?? 'webp'
    const filename = `website-screenshots/${Date.now()}_${encodeURIComponent(new URL(options.url).hostname)}.${ext}`

    const imageUrl = await uploadToStorage('task-files', filename, buffer, {
      contentType: `image/${ext}`,
      upsert: false,
    })

    return {
      imageUrl,
      thumbnailUrl: null, // Could generate a resized version in future
      capturedAt: new Date(),
    }
  } catch (error) {
    logger.error({ err: error, url: options.url }, 'Failed to capture screenshot')
    throw error
  }
}
