/**
 * Client-safe image utilities
 * These functions don't require sharp or any server-only dependencies
 */

/**
 * Get variant URLs from a full image URL
 * Works with URLs like: .../folder/full.webp
 * Returns: { full, preview, thumbnail }
 */
export function getImageVariantUrls(fullUrl: string): {
  full: string;
  preview: string;
  thumbnail: string;
} {
  // If URL doesn't end with /full.webp, return same URL for all (backwards compat)
  if (!fullUrl.includes("/full.webp")) {
    return {
      full: fullUrl,
      preview: fullUrl,
      thumbnail: fullUrl,
    };
  }

  return {
    full: fullUrl,
    preview: fullUrl.replace("/full.webp", "/preview.webp"),
    thumbnail: fullUrl.replace("/full.webp", "/thumbnail.webp"),
  };
}
