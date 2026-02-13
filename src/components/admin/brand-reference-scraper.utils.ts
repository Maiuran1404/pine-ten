/**
 * Utility functions for the BrandReferenceScraper component.
 * Contains URL parsing, image fetching, and classification helpers.
 */

/** Parse image URLs from a newline/comma-separated string. */
export function parseUrls(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter((url) => {
      try {
        new URL(url)
        return url.startsWith('http')
      } catch {
        return false
      }
    })
}

/** Parse page URLs from a newline/comma-separated string (same logic as parseUrls). */
export function parsePageUrls(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter((url) => {
      try {
        new URL(url)
        return url.startsWith('http')
      } catch {
        return false
      }
    })
}

/** Fetch an image from a URL and convert it to base64. */
export async function fetchImageAsBase64(url: string): Promise<{
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        mediaType = 'image/jpeg'
      } else if (contentType.includes('gif')) {
        mediaType = 'image/gif'
      } else if (contentType.includes('webp')) {
        mediaType = 'image/webp'
      }
      resolve({ base64, mediaType })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
