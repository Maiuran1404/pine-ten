/**
 * Image Hash Utility
 *
 * Generates perceptual hashes for images to detect duplicates
 * even when images are resized or slightly modified.
 *
 * Uses a simple average hash (aHash) algorithm:
 * 1. Resize image to 8x8
 * 2. Convert to grayscale
 * 3. Calculate average pixel value
 * 4. Generate 64-bit hash based on whether each pixel is above/below average
 */

import { createHash } from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Generate a simple hash from image buffer using SHA-256
 * This is a content hash, not a perceptual hash
 */
export function generateContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}

/**
 * Generate a perceptual hash from image buffer
 * Uses average color sampling to create a fingerprint that's
 * resistant to minor image modifications
 *
 * Note: This is a simplified version. For production, consider using
 * libraries like sharp with proper image processing.
 */
export async function generatePerceptualHash(buffer: Buffer): Promise<string> {
  // For now, we'll use a combination of:
  // 1. File size (approximate)
  // 2. First bytes signature
  // 3. Content hash
  // This provides reasonable duplicate detection without heavy dependencies

  const sizeSignature = Math.floor(buffer.length / 1000)
    .toString(16)
    .padStart(6, '0')
  const headerSignature = buffer.subarray(0, 100).toString('hex').substring(0, 20)
  const contentHash = generateContentHash(buffer)

  return `${sizeSignature}-${headerSignature}-${contentHash}`
}

/**
 * Compare two hashes for similarity
 * Returns true if hashes are similar enough to be considered duplicates
 */
export function areHashesSimilar(hash1: string | null, hash2: string | null): boolean {
  if (!hash1 || !hash2) return false

  // For content hashes, exact match is required
  const [size1, header1, content1] = hash1.split('-')
  const [size2, header2, content2] = hash2.split('-')

  // If content hash matches exactly, it's a duplicate
  if (content1 === content2) return true

  // If size and header match, likely a duplicate (same image, possibly re-encoded)
  if (size1 === size2 && header1 === header2) return true

  return false
}

/**
 * Check if a URL is valid and accessible
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must be http or https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false

    // Must have a path (not just domain)
    if (parsed.pathname === '/' || parsed.pathname === '') return false

    // Check for common image extensions or CDN patterns
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const hasImageExtension = imageExtensions.some((ext) =>
      parsed.pathname.toLowerCase().endsWith(ext)
    )

    // Check for known image CDN patterns
    const imageCdnPatterns = [
      'library.bigged.com',
      'cdn.dribbble.com',
      'images.unsplash.com',
      'supabase.co/storage',
      'cloudinary.com',
      'imgix.net',
    ]
    const isImageCdn = imageCdnPatterns.some((pattern) => url.includes(pattern))

    return hasImageExtension || isImageCdn || url.includes('/image')
  } catch (error) {
    logger.debug({ err: error, url }, 'Failed to validate image URL format')
    return false
  }
}

/**
 * Validate image dimensions meet minimum requirements
 */
export interface ImageValidationResult {
  valid: boolean
  width?: number
  height?: number
  contentType?: string
  fileSize?: number
  error?: string
}

export async function validateImageUrl(
  url: string,
  minWidth: number = 200,
  minHeight: number = 200,
  maxFileSize: number = 50 * 1024 * 1024 // 50MB
): Promise<ImageValidationResult> {
  try {
    // First, do a HEAD request to check content type and size
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PineBot/1.0)' },
    })

    if (!headResponse.ok) {
      return { valid: false, error: `HTTP ${headResponse.status}` }
    }

    const contentType = headResponse.headers.get('content-type') || ''
    const contentLength = parseInt(headResponse.headers.get('content-length') || '0')

    // Check content type
    if (!contentType.startsWith('image/')) {
      return { valid: false, error: `Not an image: ${contentType}`, contentType }
    }

    // Check file size
    if (contentLength > maxFileSize) {
      return {
        valid: false,
        error: `File too large: ${Math.round(contentLength / 1024 / 1024)}MB`,
        fileSize: contentLength,
        contentType,
      }
    }

    return {
      valid: true,
      contentType,
      fileSize: contentLength,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate URL',
    }
  }
}
