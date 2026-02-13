/**
 * Platform-specific dimension mappings
 * Auto-includes all required dimensions when a platform is detected
 */

import type { Dimension, Platform, ContentType } from '@/components/chat/brief-panel/types'

// =============================================================================
// INSTAGRAM DIMENSIONS
// =============================================================================

export const INSTAGRAM_DIMENSIONS: Record<string, Dimension[]> = {
  post: [
    { label: 'Square', width: 1080, height: 1080, aspectRatio: '1:1', isDefault: true },
    { label: 'Portrait', width: 1080, height: 1350, aspectRatio: '4:5' },
    { label: 'Landscape', width: 1080, height: 566, aspectRatio: '1.91:1' },
  ],
  story: [{ label: 'Story', width: 1080, height: 1920, aspectRatio: '9:16', isDefault: true }],
  reel: [{ label: 'Reel', width: 1080, height: 1920, aspectRatio: '9:16', isDefault: true }],
  carousel: [
    { label: 'Square Carousel', width: 1080, height: 1080, aspectRatio: '1:1', isDefault: true },
    { label: 'Portrait Carousel', width: 1080, height: 1350, aspectRatio: '4:5' },
  ],
}

// =============================================================================
// LINKEDIN DIMENSIONS
// =============================================================================

export const LINKEDIN_DIMENSIONS: Record<string, Dimension[]> = {
  post: [
    { label: 'Landscape', width: 1200, height: 627, aspectRatio: '1.91:1', isDefault: true },
    { label: 'Square', width: 1080, height: 1080, aspectRatio: '1:1' },
    { label: 'Portrait', width: 1080, height: 1350, aspectRatio: '4:5' },
  ],
  banner: [
    { label: 'Company Banner', width: 1128, height: 191, aspectRatio: '5.9:1', isDefault: true },
    { label: 'Personal Banner', width: 1584, height: 396, aspectRatio: '4:1' },
  ],
  carousel: [
    { label: 'Document Carousel', width: 1080, height: 1080, aspectRatio: '1:1', isDefault: true },
    { label: 'PDF Carousel', width: 1080, height: 1350, aspectRatio: '4:5' },
  ],
  ad: [
    {
      label: 'Sponsored Content',
      width: 1200,
      height: 627,
      aspectRatio: '1.91:1',
      isDefault: true,
    },
    { label: 'Square Ad', width: 1080, height: 1080, aspectRatio: '1:1' },
  ],
}

// =============================================================================
// FACEBOOK DIMENSIONS
// =============================================================================

export const FACEBOOK_DIMENSIONS: Record<string, Dimension[]> = {
  post: [
    { label: 'Landscape', width: 1200, height: 630, aspectRatio: '1.91:1', isDefault: true },
    { label: 'Square', width: 1080, height: 1080, aspectRatio: '1:1' },
  ],
  story: [{ label: 'Story', width: 1080, height: 1920, aspectRatio: '9:16', isDefault: true }],
  ad: [
    { label: 'Feed Ad', width: 1200, height: 628, aspectRatio: '1.91:1', isDefault: true },
    { label: 'Square Ad', width: 1080, height: 1080, aspectRatio: '1:1' },
    { label: 'Carousel Ad', width: 1080, height: 1080, aspectRatio: '1:1' },
  ],
  banner: [
    { label: 'Page Cover', width: 820, height: 312, aspectRatio: '2.63:1', isDefault: true },
    { label: 'Event Cover', width: 1920, height: 1005, aspectRatio: '1.91:1' },
  ],
}

// =============================================================================
// TWITTER/X DIMENSIONS
// =============================================================================

export const TWITTER_DIMENSIONS: Record<string, Dimension[]> = {
  post: [
    { label: 'Single Image', width: 1200, height: 675, aspectRatio: '16:9', isDefault: true },
    { label: 'Two Images', width: 700, height: 800, aspectRatio: '7:8' },
    { label: 'Square', width: 1080, height: 1080, aspectRatio: '1:1' },
  ],
  banner: [{ label: 'Header', width: 1500, height: 500, aspectRatio: '3:1', isDefault: true }],
  ad: [{ label: 'Promoted Tweet', width: 1200, height: 675, aspectRatio: '16:9', isDefault: true }],
}

// =============================================================================
// YOUTUBE DIMENSIONS
// =============================================================================

export const YOUTUBE_DIMENSIONS: Record<string, Dimension[]> = {
  thumbnail: [
    { label: 'Thumbnail', width: 1280, height: 720, aspectRatio: '16:9', isDefault: true },
  ],
  banner: [
    { label: 'Channel Art', width: 2560, height: 1440, aspectRatio: '16:9', isDefault: true },
    { label: 'Safe Area', width: 1546, height: 423, aspectRatio: '3.66:1' },
  ],
  video: [
    { label: 'Standard HD', width: 1920, height: 1080, aspectRatio: '16:9', isDefault: true },
    { label: '4K', width: 3840, height: 2160, aspectRatio: '16:9' },
    { label: 'Shorts', width: 1080, height: 1920, aspectRatio: '9:16' },
  ],
}

// =============================================================================
// TIKTOK DIMENSIONS
// =============================================================================

export const TIKTOK_DIMENSIONS: Record<string, Dimension[]> = {
  video: [{ label: 'Standard', width: 1080, height: 1920, aspectRatio: '9:16', isDefault: true }],
  ad: [
    { label: 'In-Feed Ad', width: 1080, height: 1920, aspectRatio: '9:16', isDefault: true },
    { label: 'TopView', width: 1080, height: 1920, aspectRatio: '9:16' },
  ],
}

// =============================================================================
// PRINT DIMENSIONS
// =============================================================================

export const PRINT_DIMENSIONS: Record<string, Dimension[]> = {
  poster: [
    { label: 'A4 Portrait', width: 2480, height: 3508, aspectRatio: '1:1.41', isDefault: true },
    { label: 'A4 Landscape', width: 3508, height: 2480, aspectRatio: '1.41:1' },
    { label: 'A3 Portrait', width: 3508, height: 4961, aspectRatio: '1:1.41' },
    { label: 'Letter Portrait', width: 2550, height: 3300, aspectRatio: '1:1.29' },
  ],
  flyer: [
    { label: 'A5 Portrait', width: 1748, height: 2480, aspectRatio: '1:1.42', isDefault: true },
    { label: 'A5 Landscape', width: 2480, height: 1748, aspectRatio: '1.42:1' },
    { label: 'DL Flyer', width: 1240, height: 2480, aspectRatio: '1:2' },
  ],
  banner: [
    {
      label: 'Roll-up (85x200cm)',
      width: 2551,
      height: 6000,
      aspectRatio: '1:2.35',
      isDefault: true,
    },
    { label: 'Wide Banner', width: 4800, height: 1200, aspectRatio: '4:1' },
  ],
  card: [
    { label: 'Business Card', width: 1050, height: 600, aspectRatio: '1.75:1', isDefault: true },
  ],
}

// =============================================================================
// WEB DIMENSIONS
// =============================================================================

export const WEB_DIMENSIONS: Record<string, Dimension[]> = {
  banner: [
    { label: 'Leaderboard', width: 728, height: 90, aspectRatio: '8:1', isDefault: true },
    { label: 'Medium Rectangle', width: 300, height: 250, aspectRatio: '1.2:1' },
    { label: 'Large Rectangle', width: 336, height: 280, aspectRatio: '1.2:1' },
    { label: 'Skyscraper', width: 160, height: 600, aspectRatio: '1:3.75' },
    { label: 'Wide Skyscraper', width: 300, height: 600, aspectRatio: '1:2' },
  ],
  hero: [
    { label: 'Desktop Hero', width: 1920, height: 1080, aspectRatio: '16:9', isDefault: true },
    { label: 'Wide Hero', width: 1920, height: 600, aspectRatio: '3.2:1' },
    { label: 'Mobile Hero', width: 750, height: 1334, aspectRatio: '1:1.78' },
  ],
  ad: [
    { label: 'Google Display', width: 300, height: 250, aspectRatio: '1.2:1', isDefault: true },
    { label: 'Billboard', width: 970, height: 250, aspectRatio: '3.88:1' },
    { label: 'Half Page', width: 300, height: 600, aspectRatio: '1:2' },
  ],
}

// =============================================================================
// EMAIL DIMENSIONS
// =============================================================================

export const EMAIL_DIMENSIONS: Record<string, Dimension[]> = {
  header: [
    { label: 'Email Header', width: 600, height: 200, aspectRatio: '3:1', isDefault: true },
    { label: 'Wide Header', width: 600, height: 150, aspectRatio: '4:1' },
  ],
  banner: [
    { label: 'Full Width', width: 600, height: 300, aspectRatio: '2:1', isDefault: true },
    { label: 'Hero Banner', width: 600, height: 400, aspectRatio: '1.5:1' },
  ],
  thumbnail: [
    { label: 'Product Image', width: 200, height: 200, aspectRatio: '1:1', isDefault: true },
    { label: 'Feature Image', width: 280, height: 280, aspectRatio: '1:1' },
  ],
}

// =============================================================================
// PRESENTATION DIMENSIONS
// =============================================================================

export const PRESENTATION_DIMENSIONS: Record<string, Dimension[]> = {
  slide: [
    { label: 'Widescreen (16:9)', width: 1920, height: 1080, aspectRatio: '16:9', isDefault: true },
    { label: 'Standard (4:3)', width: 1024, height: 768, aspectRatio: '4:3' },
    { label: 'A4 Slide', width: 1024, height: 768, aspectRatio: '4:3' },
  ],
}

// =============================================================================
// MASTER PLATFORM-DIMENSION MAP
// =============================================================================

export const PLATFORM_DIMENSIONS: Record<Platform, Record<string, Dimension[]>> = {
  instagram: INSTAGRAM_DIMENSIONS,
  linkedin: LINKEDIN_DIMENSIONS,
  facebook: FACEBOOK_DIMENSIONS,
  twitter: TWITTER_DIMENSIONS,
  youtube: YOUTUBE_DIMENSIONS,
  tiktok: TIKTOK_DIMENSIONS,
  print: PRINT_DIMENSIONS,
  web: WEB_DIMENSIONS,
  email: EMAIL_DIMENSIONS,
  presentation: PRESENTATION_DIMENSIONS,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all dimensions for a platform and content type
 */
export function getDimensionsForPlatform(
  platform: Platform,
  contentType?: ContentType | string
): Dimension[] {
  const platformDims = PLATFORM_DIMENSIONS[platform]
  if (!platformDims) return []

  // If content type specified, return those specific dimensions
  if (contentType) {
    const contentDims = platformDims[contentType]
    if (contentDims) return contentDims
  }

  // Otherwise, return all dimensions for the platform (flattened, unique)
  const allDims: Dimension[] = []
  const seen = new Set<string>()

  Object.values(platformDims).forEach((dims) => {
    dims.forEach((dim) => {
      const key = `${dim.width}x${dim.height}`
      if (!seen.has(key)) {
        seen.add(key)
        allDims.push(dim)
      }
    })
  })

  return allDims
}

/**
 * Get default dimension for a platform and content type
 */
export function getDefaultDimension(
  platform: Platform,
  contentType?: ContentType | string
): Dimension | null {
  const dimensions = getDimensionsForPlatform(platform, contentType)
  return dimensions.find((d) => d.isDefault) || dimensions[0] || null
}

/**
 * Get all content types available for a platform
 */
export function getContentTypesForPlatform(platform: Platform): string[] {
  const platformDims = PLATFORM_DIMENSIONS[platform]
  if (!platformDims) return []
  return Object.keys(platformDims)
}

/**
 * Map common user terms to platform
 */
export const PLATFORM_ALIASES: Record<string, Platform> = {
  // Instagram
  ig: 'instagram',
  insta: 'instagram',
  gram: 'instagram',

  // LinkedIn
  li: 'linkedin',

  // Facebook
  fb: 'facebook',
  meta: 'facebook',

  // Twitter/X
  x: 'twitter',
  tweet: 'twitter',

  // YouTube
  yt: 'youtube',
  tube: 'youtube',

  // TikTok
  tt: 'tiktok',
  tok: 'tiktok',

  // Print
  poster: 'print',
  flyer: 'print',
  brochure: 'print',
  leaflet: 'print',
  pamphlet: 'print',

  // Web
  website: 'web',
  site: 'web',
  landing: 'web',
  display: 'web',

  // Email
  newsletter: 'email',
  mail: 'email',

  // Presentation
  slides: 'presentation',
  deck: 'presentation',
  pitch: 'presentation',
  powerpoint: 'presentation',
  ppt: 'presentation',
  keynote: 'presentation',
}

/**
 * Normalize platform input to standard platform type
 */
export function normalizePlatform(input: string): Platform | null {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, '')

  // Check if it's already a valid platform
  if (PLATFORM_DIMENSIONS[normalized as Platform]) {
    return normalized as Platform
  }

  // Check aliases
  if (PLATFORM_ALIASES[normalized]) {
    return PLATFORM_ALIASES[normalized]
  }

  // Try partial matching
  const platforms = Object.keys(PLATFORM_DIMENSIONS) as Platform[]
  const match = platforms.find((p) => p.includes(normalized) || normalized.includes(p))

  return match || null
}

/**
 * Map content type aliases to standard types
 */
export const CONTENT_TYPE_ALIASES: Record<string, ContentType> = {
  // Post variants
  image: 'post',
  photo: 'post',
  static: 'post',
  feed: 'post',

  // Story variants
  stories: 'story',

  // Reel variants
  reels: 'reel',
  short: 'reel',
  shorts: 'reel',

  // Carousel variants
  carousels: 'carousel',
  slider: 'carousel',
  swipe: 'carousel',

  // Banner variants
  banners: 'banner',
  header: 'banner',
  cover: 'banner',

  // Ad variants
  ads: 'ad',
  advertisement: 'ad',
  sponsored: 'ad',
  promoted: 'ad',

  // Thumbnail variants
  thumbnails: 'thumbnail',
  thumb: 'thumbnail',

  // Slide variants
  slides: 'slide',
  presentation: 'slide',

  // Flyer variants
  flyers: 'flyer',
  leaflet: 'flyer',

  // Poster variants
  posters: 'poster',

  // Video variants
  videos: 'video',
  motion: 'video',
  animation: 'video',
}

/**
 * Normalize content type input
 */
export function normalizeContentType(input: string): ContentType | null {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, '')

  // Check if it's already a valid content type
  const validTypes: ContentType[] = [
    'post',
    'story',
    'reel',
    'carousel',
    'banner',
    'ad',
    'thumbnail',
    'slide',
    'header',
    'flyer',
    'poster',
    'video',
  ]

  if (validTypes.includes(normalized as ContentType)) {
    return normalized as ContentType
  }

  // Check aliases
  if (CONTENT_TYPE_ALIASES[normalized]) {
    return CONTENT_TYPE_ALIASES[normalized]
  }

  return null
}

/**
 * Format dimensions for display
 */
export function formatDimension(dim: Dimension): string {
  return `${dim.width} × ${dim.height} (${dim.aspectRatio})`
}

/**
 * Format dimensions list for brief
 */
export function formatDimensionsList(dims: Dimension[]): string {
  return dims.map((d) => `${d.label}: ${d.width}×${d.height}`).join(', ')
}
