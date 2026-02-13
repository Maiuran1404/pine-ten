/**
 * Utility functions for the DeliverableStyleScraper component.
 * Contains URL parsing helpers.
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

/** Parse Dribbble shot URLs from a newline/comma-separated string. */
export function parseDribbbleUrls(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.hostname === 'dribbble.com' && parsed.pathname.startsWith('/shots/')
      } catch {
        return false
      }
    })
}
