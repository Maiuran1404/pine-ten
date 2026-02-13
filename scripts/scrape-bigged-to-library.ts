#!/usr/bin/env npx tsx
/**
 * Scrape Bigged Ad Spy and Import to Deliverable Reference Library
 *
 * This script:
 * 1. Uses Playwright to scrape bigged.com/spy for ad images
 * 2. Classifies each image using Claude AI
 * 3. Uploads to Supabase storage
 * 4. Saves metadata to the deliverable_style_references table
 *
 * Usage:
 *   npx tsx scripts/scrape-bigged-to-library.ts --query "skincare" --limit 20
 *   npx tsx scripts/scrape-bigged-to-library.ts --query "fitness" --limit 50 --preview
 */

// Load environment variables FIRST before any other imports
import { config } from 'dotenv'
config({ path: '.env.local' })

// Now import everything else
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

// Parse command line arguments
const args = process.argv.slice(2)
const queryIndex = args.indexOf('--query')
const limitIndex = args.indexOf('--limit')
const previewMode = args.includes('--preview')
const includeVideos = args.includes('--include-videos')

const searchQuery = queryIndex !== -1 ? args[queryIndex + 1] : 'marketing'
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20

if (!searchQuery) {
  console.error(
    'Usage: npx tsx scripts/scrape-bigged-to-library.ts --query <search_term> [--limit <number>] [--preview] [--include-videos]'
  )
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET_NAME = 'deliverable-styles'

interface ScrapedMedia {
  thumbnailUrl: string
  videoUrl?: string
  pageId: string
  uuid: string
  type: 'video' | 'image'
}

interface ImportResult {
  url: string
  success: boolean
  name?: string
  deliverableType?: string
  styleAxis?: string
  error?: string
}

async function scrapeUrls(
  query: string,
  maxItems: number,
  skipVideos: boolean = true
): Promise<ScrapedMedia[]> {
  console.log(
    `\n🔍 Scraping bigged.com/spy for: "${query}"${skipVideos ? ' (skipping videos)' : ''}`
  )

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto('https://bigged.com/spy', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(5000)

    const iframe = page.frameLocator('iframe').first()

    // Search
    const searchBox = iframe.getByRole('textbox', { name: 'Search Bigged...' })
    await searchBox.click()
    await searchBox.fill(query)
    await searchBox.press('Enter')
    await page.waitForTimeout(3000)

    // Scroll and collect
    const allMedia: Map<string, ScrapedMedia> = new Map()
    let prevCount = 0
    let noChangeCount = 0

    console.log('📜 Scrolling to load content...')

    while (allMedia.size < maxItems && noChangeCount < 5) {
      // Extract media URLs
      const media = await iframe.locator('img, video').evaluateAll((elements) => {
        const results: Array<{ src: string; type: string }> = []
        elements.forEach((el) => {
          const src = (el as HTMLImageElement | HTMLVideoElement).src
          if (src && src.includes('library.bigged.com')) {
            results.push({ src, type: el.tagName })
          }
        })
        return results
      })

      // Process and deduplicate
      for (const { src, type } of media) {
        // Extract page_id and uuid from URL
        const pageIdMatch = src.match(/page_id=(\d+)/)
        const uuidMatch = src.match(/\/([a-f0-9-]{36})\.(jpg|mp4)$/)

        if (pageIdMatch && uuidMatch) {
          const pageId = pageIdMatch[1]
          const uuid = uuidMatch[1]
          const key = `${pageId}-${uuid}`

          if (!allMedia.has(key)) {
            if (type === 'VIDEO') {
              // Skip videos if skipVideos is true
              if (!skipVideos) {
                allMedia.set(key, {
                  thumbnailUrl: src
                    .replace('.mp4', '.jpg')
                    .replace('/videos/', '/videos/thumbnails/'),
                  videoUrl: src,
                  pageId,
                  uuid,
                  type: 'video',
                })
              }
            } else if (src.includes('/videos/thumbnails/')) {
              // Skip video thumbnails if skipVideos is true
              if (!skipVideos) {
                allMedia.set(key, {
                  thumbnailUrl: src,
                  videoUrl: src.replace('/thumbnails/', '/').replace('.jpg', '.mp4'),
                  pageId,
                  uuid,
                  type: 'video',
                })
              }
            } else if (src.includes('/images/')) {
              allMedia.set(key, {
                thumbnailUrl: src,
                pageId,
                uuid,
                type: 'image',
              })
            }
          }
        }
      }

      console.log(`   Found ${allMedia.size} unique items...`)

      // Scroll
      await iframe.locator('body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
      await page.waitForTimeout(1500)

      if (allMedia.size === prevCount) {
        noChangeCount++
      } else {
        noChangeCount = 0
      }
      prevCount = allMedia.size
    }

    await browser.close()
    return Array.from(allMedia.values()).slice(0, maxItems)
  } catch (error) {
    await browser.close()
    throw error
  }
}

async function importToLibrary(items: ScrapedMedia[], preview: boolean): Promise<ImportResult[]> {
  // Dynamic imports to ensure env vars are loaded
  const { db } = await import('../src/db')
  const { deliverableStyleReferences } = await import('../src/db/schema')
  const { classifyDeliverableStyle } = await import('../src/lib/ai/classify-deliverable-style')
  const { eq } = await import('drizzle-orm')

  const results: ImportResult[] = []

  console.log(`\n${preview ? '👀 Preview mode' : '⬆️  Importing'} ${items.length} items...`)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const url = item.thumbnailUrl

    try {
      console.log(
        `\n[${i + 1}/${items.length}] Processing: ${item.pageId}_${item.uuid.substring(0, 8)}...`
      )

      // Check if already imported (by checking for similar URL pattern in database)
      const existing = await db
        .select({ id: deliverableStyleReferences.id })
        .from(deliverableStyleReferences)
        .where(eq(deliverableStyleReferences.imageUrl, url))
        .limit(1)

      if (existing.length > 0) {
        console.log('   ⏭️  Already exists, skipping')
        results.push({ url, success: false, error: 'Already exists' })
        continue
      }

      // Fetch the image
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PineBot/1.0)' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')

      // Determine media type
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
      if (contentType.includes('png')) mediaType = 'image/png'
      else if (contentType.includes('webp')) mediaType = 'image/webp'
      else if (contentType.includes('gif')) mediaType = 'image/gif'

      // Classify with AI
      console.log('   🤖 Classifying with AI...')
      const classification = await classifyDeliverableStyle(base64, mediaType)

      // Skip video thumbnails and UGC content
      if (
        classification.isVideoThumbnail ||
        (classification.contentType && classification.contentType !== 'designed_graphic')
      ) {
        console.log(
          `   ⏭️  Skipped: Not a designed graphic (${classification.contentType || 'video_thumbnail'})`
        )
        results.push({
          url,
          success: false,
          error: `Not a designed graphic: ${classification.contentType || 'video_thumbnail'}`,
        })
        continue
      }

      console.log(
        `   📊 Type: ${classification.deliverableType}, Style: ${classification.styleAxis}`
      )
      console.log(`   📝 Name: ${classification.name}`)

      if (preview) {
        results.push({
          url,
          success: true,
          name: classification.name,
          deliverableType: classification.deliverableType,
          styleAxis: classification.styleAxis,
        })
        continue
      }

      // Upload to Supabase Storage
      const timestamp = Date.now()
      const storagePath = `bigged/${timestamp}-${item.pageId}-${item.uuid.substring(0, 8)}.jpg`

      console.log('   ☁️  Uploading to storage...')
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: mediaType,
          upsert: false,
        })

      if (uploadError) {
        // Try to create bucket if it doesn't exist
        if (uploadError.message.includes('not found')) {
          await supabase.storage.createBucket(BUCKET_NAME, { public: true })
          const { error: retryError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
              contentType: mediaType,
              upsert: false,
            })
          if (retryError) throw retryError
        } else {
          throw uploadError
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)

      const imageUrl = urlData.publicUrl

      // Insert into database
      console.log('   💾 Saving to database...')
      await db.insert(deliverableStyleReferences).values({
        name: classification.name,
        description: classification.description,
        imageUrl,
        deliverableType: classification.deliverableType,
        styleAxis: classification.styleAxis,
        subStyle: classification.subStyle,
        semanticTags: classification.semanticTags,
        colorTemperature: classification.colorTemperature,
        energyLevel: classification.energyLevel,
        densityLevel: classification.densityLevel,
        formalityLevel: classification.formalityLevel,
        colorSamples: classification.colorSamples || [],
        industries: classification.industries || [],
        targetAudience: classification.targetAudience,
        visualElements: classification.visualElements || [],
        moodKeywords: classification.moodKeywords || [],
        isActive: true,
      })

      console.log('   ✅ Success!')
      results.push({
        url,
        success: true,
        name: classification.name,
        deliverableType: classification.deliverableType,
        styleAxis: classification.styleAxis,
      })

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Bigged Ad Spy → Deliverable Reference Library Importer')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Query: "${searchQuery}"`)
  console.log(`  Limit: ${limit}`)
  console.log(`  Mode: ${previewMode ? 'Preview (no save)' : 'Import'}`)
  console.log(`  Videos: ${includeVideos ? 'Included' : 'Skipped'}`)
  console.log('═══════════════════════════════════════════════════════════')

  try {
    // Step 1: Scrape URLs (skip videos by default)
    const scrapedItems = await scrapeUrls(searchQuery, limit, !includeVideos)
    console.log(`\n✅ Scraped ${scrapedItems.length} items from bigged.com`)

    if (scrapedItems.length === 0) {
      console.log('No items found. Try a different search query.')
      process.exit(0)
    }

    // Step 2: Import to library
    const results = await importToLibrary(scrapedItems, previewMode)

    // Summary
    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('  SUMMARY')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`  Total processed: ${results.length}`)
    console.log(`  Successful: ${successful.length}`)
    console.log(`  Failed: ${failed.length}`)

    if (successful.length > 0) {
      console.log('\n  Imported styles by type:')
      const byType = successful.reduce(
        (acc, r) => {
          const type = r.deliverableType || 'unknown'
          acc[type] = (acc[type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`    • ${type}: ${count}`)
      })

      console.log('\n  Imported styles by axis:')
      const byAxis = successful.reduce(
        (acc, r) => {
          const axis = r.styleAxis || 'unknown'
          acc[axis] = (acc[axis] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
      Object.entries(byAxis).forEach(([axis, count]) => {
        console.log(`    • ${axis}: ${count}`)
      })
    }

    if (failed.length > 0 && failed.length <= 10) {
      console.log('\n  Failed items:')
      failed.forEach((r) => {
        console.log(`    • ${r.url.substring(0, 60)}...: ${r.error}`)
      })
    }

    console.log('═══════════════════════════════════════════════════════════\n')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main().catch(console.error)
