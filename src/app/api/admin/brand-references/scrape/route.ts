import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import FirecrawlApp from '@mendable/firecrawl-js'
import { logger } from '@/lib/logger'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

interface ScrapedImage {
  url: string
  alt?: string
  width?: number
  height?: number
  source: 'img' | 'og' | 'meta' | 'background'
}

// Initialize Firecrawl if API key is available
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null

// Extract images from HTML using regex patterns
function extractImagesFromHtml(html: string, baseUrl: string): ScrapedImage[] {
  const images: ScrapedImage[] = []
  const seenUrls = new Set<string>()

  // Helper to resolve relative URLs
  const resolveUrl = (src: string): string | null => {
    try {
      if (!src || src.length < 5) return null
      if (src.startsWith('data:')) return null
      if (src.startsWith('//')) return `https:${src}`
      if (src.startsWith('/')) return new URL(src, baseUrl).href
      if (src.startsWith('http')) return src
      return new URL(src, baseUrl).href
    } catch (error) {
      logger.debug({ err: error, src }, 'Failed to resolve URL')
      return null
    }
  }

  // Helper to check if URL looks like a valid image
  const isImageUrl = (url: string): boolean => {
    const lower = url.toLowerCase()
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(lower)) return true
    if (lower.includes('behance.net') && lower.includes('project_modules')) return true
    if (lower.includes('behance.net') && lower.includes('/projects/')) return true
    // Pinterest CDN
    if (lower.includes('pinimg.com')) return true
    // Cosmos.so CDN patterns
    if (lower.includes('cosmos.so') && (lower.includes('/i/') || lower.includes('/image')))
      return true
    if (lower.includes('cosmoscdn') || lower.includes('cosmos-cdn')) return true
    // Common image CDNs
    if (lower.includes('cloudinary.com')) return true
    if (lower.includes('imgix.net')) return true
    if (lower.includes('imagedelivery.net')) return true
    if (lower.includes('cloudfront.net') && /\.(jpg|jpeg|png|gif|webp)/i.test(lower)) return true
    if (lower.includes('amazonaws.com') && /\.(jpg|jpeg|png|gif|webp)/i.test(lower)) return true
    if (lower.includes('cdn') && lower.includes('image')) return true
    if (lower.includes('images.') || lower.includes('/images/')) return true
    if (lower.includes('media.') || lower.includes('/media/')) return true
    return false
  }

  // Helper to convert Pinterest URLs to larger sizes
  const upgradePinterestUrl = (url: string): string => {
    if (!url.includes('pinimg.com')) return url
    // Convert small sizes to 736x (large) - available sizes: 60x60, 75x75, 236x, 474x, 736x, originals
    return url
      .replace(/\/60x60\//g, '/736x/')
      .replace(/\/75x75\//g, '/736x/')
      .replace(/\/236x\//g, '/736x/')
      .replace(/\/474x\//g, '/736x/')
  }

  // Helper to add image if valid and not seen
  const addImage = (
    url: string | null,
    source: ScrapedImage['source'],
    alt?: string,
    width?: number,
    height?: number
  ) => {
    if (!url) return
    // Upgrade Pinterest URLs to larger sizes
    const finalUrl = upgradePinterestUrl(url)
    if (seenUrls.has(finalUrl)) return
    seenUrls.add(finalUrl)
    images.push({ url: finalUrl, alt, width, height, source })
  }

  let match

  // Extract from <img> tags - multiple patterns
  const imgRegex = /<img[^>]*>/gi
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0]
    const srcAttrs = ['src', 'data-src', 'data-original', 'data-lazy-src']
    for (const attr of srcAttrs) {
      const attrMatch = imgTag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'))
      if (attrMatch) {
        const url = resolveUrl(attrMatch[1])
        if (url) {
          const widthMatch = imgTag.match(/width=["']?(\d+)/i)
          const heightMatch = imgTag.match(/height=["']?(\d+)/i)
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/i)
          addImage(
            url,
            'img',
            altMatch?.[1],
            widthMatch ? parseInt(widthMatch[1]) : undefined,
            heightMatch ? parseInt(heightMatch[1]) : undefined
          )
        }
      }
    }
  }

  // Extract from srcset attributes
  const srcsetRegex = /srcset=["']([^"']+)["']/gi
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1]
    const sources = srcset.split(',').map((s) => {
      const parts = s.trim().split(/\s+/)
      return { url: parts[0], size: parts[1] ? parseInt(parts[1]) : 0 }
    })
    sources.sort((a, b) => b.size - a.size)
    for (const src of sources.slice(0, 1)) {
      const url = resolveUrl(src.url)
      addImage(url, 'img')
    }
  }

  // Extract from data attributes
  const dataAttrs = ['data-src', 'data-original', 'data-lazy', 'data-image']
  for (const attr of dataAttrs) {
    const dataRegex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi')
    while ((match = dataRegex.exec(html)) !== null) {
      const url = resolveUrl(match[1])
      if (url && isImageUrl(url)) {
        addImage(url, 'img')
      }
    }
  }

  // Extract from og:image meta tags
  const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
  while ((match = ogImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1])
    addImage(url, 'og')
  }

  // Alternative og:image format
  const ogImageAltRegex = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi
  while ((match = ogImageAltRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1])
    addImage(url, 'og')
  }

  // Extract from background-image CSS
  const bgImageRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi
  while ((match = bgImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1])
    if (url && isImageUrl(url)) {
      addImage(url, 'background')
    }
  }

  // Behance project module URLs
  const behanceModuleRegex = /https?:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"'\s\\]+/gi
  while ((match = behanceModuleRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Behance project thumbnails - convert to larger versions
  const behanceProjectRegex = /https?:\/\/mir-s3-cdn-cf\.behance\.net\/projects\/\d+\/[^"'\s\\]+/gi
  while ((match = behanceProjectRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    url = url.replace(/\/projects\/\d+\//, '/projects/max_808/')
    addImage(url, 'img')
  }

  // Generic CDN image URLs in JSON
  const cdnImageRegex = /"(https?:\/\/[^"]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)[^"]*)"/gi
  while ((match = cdnImageRegex.exec(html)) !== null) {
    const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '')
    const resolved = resolveUrl(url)
    if (resolved && isImageUrl(resolved)) {
      addImage(resolved, 'img')
    }
  }

  // Pinterest-specific image extraction - use permissive patterns
  // Pattern 1: Any pinimg.com URL with image extension (most permissive)
  const pinterestAnyImageRegex = /https?:\/\/i\.pinimg\.com\/[^"'\s<>]+\.(jpg|jpeg|png|gif|webp)/gi
  while ((match = pinterestAnyImageRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    // Clean up any trailing characters that aren't part of the extension
    url = url.replace(/[^a-z]$/i, '')
    addImage(url, 'img')
  }

  // Pattern 2: Pinterest video thumbnails
  const pinterestVideoRegex =
    /https?:\/\/i\.pinimg\.com\/videos\/thumbnails\/[^"'\s<>]+\.(jpg|jpeg|png)/gi
  while ((match = pinterestVideoRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Pattern 3: Pinterest URLs from srcset attributes (highest quality versions)
  const srcsetPinterestRegex =
    /https?:\/\/i\.pinimg\.com\/(?:originals|736x)\/[^"'\s,]+\.(jpg|jpeg|png|gif|webp)/gi
  while ((match = srcsetPinterestRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Pattern 4: Pinterest URLs with escaped characters in JSON
  const pinterestEscapedRegex = /i\.pinimg\.com[^"'\s]*\.(jpg|jpeg|png|gif|webp)/gi
  while ((match = pinterestEscapedRegex.exec(html)) !== null) {
    let url = 'https://' + match[0].replace(/\\u002F/g, '/').replace(/\\/g, '/')
    // Clean double slashes except after https:
    url = url.replace(/([^:])\/\//g, '$1/')
    addImage(url, 'img')
  }

  // Cosmos.so image extraction
  // Pattern: cosmos CDN URLs
  const cosmosImageRegex =
    /https?:\/\/[^"'\s]*cosmos[^"'\s]*\/[^"'\s]*\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi
  while ((match = cosmosImageRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Cloudinary image extraction
  const cloudinaryRegex =
    /https?:\/\/res\.cloudinary\.com\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi
  while ((match = cloudinaryRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Imgix image extraction
  const imgixRegex = /https?:\/\/[^"'\s]+\.imgix\.net\/[^"'\s]+/gi
  while ((match = imgixRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.includes('?')) {
      addImage(url, 'img')
    }
  }

  // CloudFront/AWS S3 image extraction
  const awsRegex =
    /https?:\/\/[^"'\s]+\.(cloudfront\.net|amazonaws\.com)\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi
  while ((match = awsRegex.exec(html)) !== null) {
    const url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '')
    addImage(url, 'img')
  }

  // Generic high-quality image URLs in JSON (looking for larger dimensions in URL)
  const largeImageRegex =
    /"(https?:\/\/[^"]+(?:\/(?:large|full|original|max|1080|1200|1600|2000)[^"]*)?\.(?:jpg|jpeg|png|webp)[^"]*)"/gi
  while ((match = largeImageRegex.exec(html)) !== null) {
    const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '')
    if (isImageUrl(url)) {
      addImage(url, 'img')
    }
  }

  return images
}

// Filter images by likely being "content" images (not icons, avatars, etc.)
function filterContentImages(images: ScrapedImage[], minSize = 200): ScrapedImage[] {
  return images.filter((img) => {
    // Skip known small images
    if (img.width && img.width < minSize) return false
    if (img.height && img.height < minSize) return false

    // Skip common non-content patterns
    const url = img.url.toLowerCase()

    // Always allow Behance project images
    if (url.includes('mir-s3-cdn-cf.behance.net/projects/')) return true
    if (url.includes('mir-s3-cdn-cf.behance.net/project_modules/')) return true
    // Always allow Pinterest images (will be upgraded to 736x)
    if (url.includes('i.pinimg.com/736x/')) return true
    if (url.includes('i.pinimg.com/originals/')) return true
    if (url.includes('i.pinimg.com/474x/')) return true
    if (url.includes('i.pinimg.com/236x/')) return true
    // Skip small Pinterest thumbnails
    if (url.includes('i.pinimg.com/60x60/')) return false
    if (url.includes('i.pinimg.com/75x75/')) return false
    if (url.includes('i.pinimg.com/150x150/')) return false
    // Always allow Cosmos.so images
    if (url.includes('cosmos.so') || url.includes('cosmos-cdn') || url.includes('cosmoscdn'))
      return true
    // Always allow major CDN images
    if (url.includes('cloudinary.com')) return true
    if (url.includes('imgix.net')) return true
    if (url.includes('imagedelivery.net')) return true

    if (url.includes('avatar')) return false
    if (url.includes('icon')) return false
    if (url.includes('logo') && !url.includes('brand')) return false
    if (url.includes('favicon')) return false
    if (url.includes('emoji')) return false
    if (url.includes('badge')) return false
    if (url.includes('spinner')) return false
    if (url.includes('loading')) return false
    if (url.includes('/ads/')) return false
    if (url.includes('tracking')) return false
    if (url.includes('pixel')) return false
    if (url.includes('1x1')) return false
    if (url.includes('spacer')) return false

    // Skip SVG data URIs
    if (url.startsWith('data:image/svg')) return false

    // Prefer larger images from srcset
    if (url.includes('@2x') || url.includes('@3x')) return true
    if (url.includes('-large') || url.includes('_large')) return true

    return true
  })
}

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const {
        url,
        useFirecrawl = false,
        minSize = 200,
        limit = 50,
      } = body as {
        url: string
        useFirecrawl?: boolean
        minSize?: number
        limit?: number
      }

      if (!url) {
        throw Errors.badRequest('URL is required')
      }

      // Validate URL
      let parsedUrl: URL
      try {
        parsedUrl = new URL(url)
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        throw Errors.badRequest('Invalid URL')
      }

      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`
      let images: ScrapedImage[] = []

      // Check if site is unsupported by Firecrawl (non-enterprise plans)
      const isPinterest = url.includes('pinterest.com') || url.includes('pin.it')
      const isCosmos = url.includes('cosmos.so')
      const isUnsupportedSite = isPinterest || isCosmos
      let firecrawlError: string | null = null

      // Option 1: Use Firecrawl for JS-heavy sites (not unsupported sites)
      if (useFirecrawl && firecrawl && !isUnsupportedSite) {
        try {
          // Build extensive scroll actions to load more content
          const scrollActions: Array<
            { type: 'scroll'; direction: 'down' } | { type: 'wait'; milliseconds: number }
          > = []
          // Scroll 15 times to load lots of content
          for (let i = 0; i < 15; i++) {
            scrollActions.push({ type: 'scroll', direction: 'down' })
            scrollActions.push({ type: 'wait', milliseconds: 1200 })
          }

          const scrapeResult = await firecrawl.scrape(url, {
            formats: ['html', 'rawHtml'],
            waitFor: 8000, // Wait 8 seconds for initial JS to render
            actions: scrollActions,
          })

          // Use rawHtml first (more complete), fall back to html
          const htmlContent = scrapeResult.rawHtml || scrapeResult.html
          if (htmlContent) {
            logger.debug({ url, htmlLength: htmlContent.length }, 'Firecrawl returned HTML')
            images = extractImagesFromHtml(htmlContent, baseUrl)
            logger.debug({ url, imageCount: images.length }, 'Firecrawl extracted raw images')
          } else {
            logger.debug({ url }, 'Firecrawl returned no HTML content')
          }
        } catch (error: unknown) {
          logger.error({ error }, 'Firecrawl error')
          // Check if it's a "website not supported" error
          if (error && typeof error === 'object' && 'details' in error) {
            const details = (error as { details?: { error?: string } }).details
            if (details?.error?.includes('not currently supported')) {
              firecrawlError =
                'This website is not supported by Firecrawl. Try using the "Paste Image URLs" tab instead.'
            }
          }
          // Fall back to simple fetch
        }
      }

      // For unsupported sites, return a helpful error message
      if (isUnsupportedSite && images.length === 0) {
        if (isPinterest) {
          firecrawlError =
            'Pinterest requires browser-based scraping which is not available. Please use the "Paste Image URLs" tab to import Pinterest images directly. You can right-click images on Pinterest and copy their URLs.'
        } else if (isCosmos) {
          firecrawlError =
            'Cosmos.so requires browser-based scraping which is not available. Please use the "Paste Image URLs" tab to import images directly. You can right-click images on Cosmos and copy their URLs.'
        }
      }

      // Option 2: Simple fetch (for static sites or as fallback)
      if (images.length === 0) {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        })

        if (!response.ok) {
          throw Errors.badRequest(`Failed to fetch page: ${response.status}`)
        }

        const html = await response.text()
        images = extractImagesFromHtml(html, baseUrl)
      }

      // Filter and deduplicate
      const filteredImages = filterContentImages(images, minSize)

      // Sort by priority: og images first, then by size hints
      filteredImages.sort((a, b) => {
        // OG images are usually the hero images
        if (a.source === 'og' && b.source !== 'og') return -1
        if (b.source === 'og' && a.source !== 'og') return 1

        // Prefer images with known large dimensions
        const aSize = (a.width || 0) * (a.height || 0)
        const bSize = (b.width || 0) * (b.height || 0)
        return bSize - aSize
      })

      // Limit results
      const limitedImages = filteredImages.slice(0, limit)

      return successResponse({
        url,
        totalFound: images.length,
        filtered: filteredImages.length,
        images: limitedImages,
        firecrawlUsed: useFirecrawl && firecrawl !== null && !isUnsupportedSite,
        firecrawlAvailable: firecrawl !== null,
        warning: firecrawlError,
      })
    },
    { endpoint: 'POST /api/admin/brand-references/scrape' }
  )
}
