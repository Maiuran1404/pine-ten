import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { brandReferences } from '@/db/schema'
import { classifyBrandImage } from '@/lib/ai/classify-brand-image'
import { uploadToStorage } from '@/lib/storage'
import { optimizeImage } from '@/lib/image/optimize'
import { logger } from '@/lib/logger'

const BUCKET_NAME = 'brand-references'

interface ImportResult {
  url: string
  success: boolean
  data?: {
    id: string
    name: string
    imageUrl: string
    classification: {
      toneBucket: string
      energyBucket: string
      densityBucket: string
      colorBucket: string
      colorSamples: string[]
      confidence: number
    }
  }
  error?: string
}

// POST: Import images from URLs or base64 data (classify and save)
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { urls, images } = body as {
        urls?: string[]
        images?: Array<{
          url: string
          base64: string
          mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
          classification?: {
            name: string
            description: string
            toneBucket: string
            energyBucket: string
            densityBucket: string
            colorBucket: string
            colorSamples: string[]
            confidence: number
          }
        }>
      }

      const results: ImportResult[] = []

      // Handle base64 images (client-side fetched)
      if (images && Array.isArray(images) && images.length > 0) {
        const imagesToProcess = images.slice(0, 5)

        for (const image of imagesToProcess) {
          try {
            if (!image.base64 || !image.mediaType) {
              results.push({
                url: image.url,
                success: false,
                error: 'Missing base64 or mediaType',
              })
              continue
            }

            // Convert base64 to buffer
            const buffer = Buffer.from(image.base64, 'base64')

            // Check file size (max 10MB)
            if (buffer.length > 10 * 1024 * 1024) {
              results.push({
                url: image.url,
                success: false,
                error: 'Image too large (max 10MB)',
              })
              continue
            }

            // Optimize image - creates WebP variants
            const variants = await optimizeImage(buffer)

            // Use provided classification or classify with AI
            let classification = image.classification
            if (!classification) {
              const base64ForAI = variants.full.buffer.toString('base64')
              classification = await classifyBrandImage(base64ForAI, 'image/webp')
            }

            // Generate folder name
            const urlPath = new URL(image.url).pathname
            const originalFilename = urlPath.split('/').pop() || `imported-${Date.now()}`
            const cleanFilename = originalFilename
              .replace(/\.[^.]+$/, '')
              .replace(/[^a-zA-Z0-9-]/g, '_')
            const timestamp = Date.now()
            const folderPath = `${timestamp}-${cleanFilename}`

            // Upload all variants
            const [imageUrl] = await Promise.all([
              uploadToStorage(BUCKET_NAME, `${folderPath}/full.webp`, variants.full.buffer, {
                contentType: 'image/webp',
              }),
              uploadToStorage(BUCKET_NAME, `${folderPath}/preview.webp`, variants.preview.buffer, {
                contentType: 'image/webp',
              }),
              uploadToStorage(
                BUCKET_NAME,
                `${folderPath}/thumbnail.webp`,
                variants.thumbnail.buffer,
                { contentType: 'image/webp' }
              ),
            ])

            // Insert into database
            const [newReference] = await db
              .insert(brandReferences)
              .values({
                name: classification.name,
                description: classification.description,
                imageUrl,
                toneBucket: classification.toneBucket,
                energyBucket: classification.energyBucket,
                densityBucket: classification.densityBucket,
                colorBucket: classification.colorBucket,
                colorSamples: classification.colorSamples,
                isActive: true,
              })
              .returning()

            results.push({
              url: image.url,
              success: true,
              data: {
                id: newReference.id,
                name: classification.name,
                imageUrl,
                classification: {
                  toneBucket: classification.toneBucket,
                  energyBucket: classification.energyBucket,
                  densityBucket: classification.densityBucket,
                  colorBucket: classification.colorBucket,
                  colorSamples: classification.colorSamples,
                  confidence: classification.confidence,
                },
              },
            })
          } catch (error) {
            logger.error({ error, url: image.url }, 'Error processing base64 image')
            results.push({
              url: image.url,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }

        return successResponse({
          processed: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        })
      }

      // Handle URL-based import (legacy - may fail for some CDNs)
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw Errors.badRequest('No URLs or images provided')
      }

      // Limit to 20 URLs per request
      const urlsToProcess = urls.slice(0, 20)

      for (const url of urlsToProcess) {
        try {
          // Validate URL
          const parsedUrl = new URL(url)
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            results.push({
              url,
              success: false,
              error: 'Invalid URL protocol',
            })
            continue
          }

          // Fetch the image
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PineBot/1.0)',
            },
          })

          if (!response.ok) {
            results.push({
              url,
              success: false,
              error: `Failed to fetch: ${response.status} ${response.statusText}`,
            })
            continue
          }

          const contentType = response.headers.get('content-type') || ''
          if (!contentType.startsWith('image/')) {
            results.push({
              url,
              success: false,
              error: `Not an image: ${contentType}`,
            })
            continue
          }

          // Convert to buffer and base64
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Check file size (max 10MB)
          if (buffer.length > 10 * 1024 * 1024) {
            results.push({
              url,
              success: false,
              error: 'Image too large (max 10MB)',
            })
            continue
          }

          // Optimize image - creates WebP variants (full, preview, thumbnail)
          const variants = await optimizeImage(buffer)

          // Use optimized full image for AI classification (smaller = faster)
          const base64 = variants.full.buffer.toString('base64')
          const mediaType = 'image/webp' as const

          // Classify with AI
          const classification = await classifyBrandImage(base64, mediaType)

          // Generate folder name from URL
          const urlPath = parsedUrl.pathname
          const originalFilename = urlPath.split('/').pop() || `imported-${Date.now()}`
          const cleanFilename = originalFilename
            .replace(/\.[^.]+$/, '') // Remove extension
            .replace(/[^a-zA-Z0-9-]/g, '_')
          const timestamp = Date.now()
          const folderPath = `${timestamp}-${cleanFilename}`

          // Helper to upload a variant
          const supabase = getAdminStorageClient()
          const uploadVariant = async (variantName: string, variantBuffer: Buffer) => {
            const path = `${folderPath}/${variantName}.webp`
            const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, variantBuffer, {
              contentType: 'image/webp',
              upsert: false,
            })

            if (error) {
              // If bucket doesn't exist, create it and retry
              if (error.message.includes('not found')) {
                await supabase.storage.createBucket(BUCKET_NAME, {
                  public: true,
                })
                const { error: retryError } = await supabase.storage
                  .from(BUCKET_NAME)
                  .upload(path, variantBuffer, {
                    contentType: 'image/webp',
                    upsert: false,
                  })
                if (retryError) throw retryError
              } else {
                throw error
              }
            }
            return path
          }

          // Upload all variants in parallel
          await Promise.all([
            uploadVariant('full', variants.full.buffer),
            uploadVariant('preview', variants.preview.buffer),
            uploadVariant('thumbnail', variants.thumbnail.buffer),
          ])

          // Get public URL for full image (main imageUrl)
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`${folderPath}/full.webp`)

          const imageUrl = urlData.publicUrl

          // Log size savings
          const originalSize = buffer.length
          const optimizedSize = variants.full.size + variants.preview.size + variants.thumbnail.size
          logger.debug(
            {
              originalSize,
              optimizedSize,
              percentSaved: ((1 - optimizedSize / originalSize) * 100).toFixed(0),
            },
            'Image optimized'
          )

          // Insert into database
          const [newReference] = await db
            .insert(brandReferences)
            .values({
              name: classification.name,
              description: classification.description,
              imageUrl,
              toneBucket: classification.toneBucket,
              energyBucket: classification.energyBucket,
              densityBucket: classification.densityBucket,
              colorBucket: classification.colorBucket,
              colorSamples: classification.colorSamples,
              isActive: true,
            })
            .returning()

          results.push({
            url,
            success: true,
            data: {
              id: newReference.id,
              name: classification.name,
              imageUrl,
              classification: {
                toneBucket: classification.toneBucket,
                energyBucket: classification.energyBucket,
                densityBucket: classification.densityBucket,
                colorBucket: classification.colorBucket,
                colorSamples: classification.colorSamples,
                confidence: classification.confidence,
              },
            },
          })
        } catch (error) {
          logger.error({ error, url }, 'Error processing URL')
          results.push({
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return successResponse({
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      })
    },
    { endpoint: 'POST /api/admin/brand-references/import-urls' }
  )
}

// PUT: Preview/classify URLs without saving (for review step)
export async function PUT(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { urls } = body as { urls: string[] }

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw Errors.badRequest('No URLs provided')
      }

      // Limit to 20 URLs per request
      const urlsToProcess = urls.slice(0, 20)
      const results: Array<{
        url: string
        success: boolean
        classification?: {
          name: string
          description: string
          toneBucket: string
          energyBucket: string
          densityBucket: string
          colorBucket: string
          colorSamples: string[]
          confidence: number
        }
        error?: string
      }> = []

      for (const url of urlsToProcess) {
        try {
          // Validate URL
          const parsedUrl = new URL(url)
          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            results.push({
              url,
              success: false,
              error: 'Invalid URL protocol',
            })
            continue
          }

          // Fetch the image
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PineBot/1.0)',
            },
          })

          if (!response.ok) {
            results.push({
              url,
              success: false,
              error: `Failed to fetch: ${response.status} ${response.statusText}`,
            })
            continue
          }

          const contentType = response.headers.get('content-type') || ''
          if (!contentType.startsWith('image/')) {
            results.push({
              url,
              success: false,
              error: `Not an image: ${contentType}`,
            })
            continue
          }

          // Convert to base64
          const arrayBuffer = await response.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')

          // Determine media type
          let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png'
          if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            mediaType = 'image/jpeg'
          } else if (contentType.includes('gif')) {
            mediaType = 'image/gif'
          } else if (contentType.includes('webp')) {
            mediaType = 'image/webp'
          }

          // Classify with AI (preview only)
          const classification = await classifyBrandImage(base64, mediaType)

          results.push({
            url,
            success: true,
            classification,
          })
        } catch (error) {
          results.push({
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return successResponse({ results })
    },
    { endpoint: 'PUT /api/admin/brand-references/import-urls' }
  )
}

// PATCH: Classify images from base64 data (client-side fetch to bypass CDN restrictions)
export async function PATCH(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { images } = body as {
        images: Array<{
          url: string
          base64: string
          mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        }>
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        throw Errors.badRequest('No images provided')
      }

      // Limit to 5 images per request (classification is expensive)
      const imagesToProcess = images.slice(0, 5)
      const results: Array<{
        url: string
        success: boolean
        classification?: {
          name: string
          description: string
          toneBucket: string
          energyBucket: string
          densityBucket: string
          colorBucket: string
          colorSamples: string[]
          confidence: number
        }
        error?: string
      }> = []

      for (const image of imagesToProcess) {
        try {
          if (!image.base64 || !image.mediaType) {
            results.push({
              url: image.url,
              success: false,
              error: 'Missing base64 or mediaType',
            })
            continue
          }

          // Classify with AI directly from base64
          const classification = await classifyBrandImage(image.base64, image.mediaType)

          results.push({
            url: image.url,
            success: true,
            classification,
          })
        } catch (error) {
          logger.error({ error, url: image.url }, 'Error classifying image')
          results.push({
            url: image.url,
            success: false,
            error: error instanceof Error ? error.message : 'Classification failed',
          })
        }
      }

      return successResponse({ results })
    },
    { endpoint: 'PATCH /api/admin/brand-references/import-urls' }
  )
}
