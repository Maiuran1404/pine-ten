/**
 * CLI script to seed website inspirations into the database.
 *
 * Usage: npx tsx src/db/seeds/website-inspirations-seed.ts
 *
 * Options:
 *   --dry-run      Preview what would be inserted without writing to DB
 *   --skip-screenshots  Insert entries with placeholder screenshots (fast mode)
 *   --batch-size N      Number of concurrent screenshots per batch (default: 5)
 *   --resume            Skip URLs that already exist in the DB
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import { websiteInspirations } from '../schema'
import { WEBSITE_INSPIRATIONS_DATA } from './website-inspirations-data'

// Parse CLI args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_SCREENSHOTS = args.includes('--skip-screenshots')
const RESUME = args.includes('--resume')
const BATCH_SIZE = (() => {
  const idx = args.indexOf('--batch-size')
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10)
  return 5
})()
const BATCH_DELAY_MS = 2000

// Screenshot capture (inline to avoid server-only import)
async function captureScreenshotForSeed(
  url: string
): Promise<{ imageUrl: string; thumbnailUrl: string | null }> {
  const apiKey = process.env.SCREENSHOT_API_KEY
  const apiUrl = process.env.SCREENSHOT_API_URL || 'https://api.screenshotone.com/take'

  if (!apiKey) {
    return {
      imageUrl: `https://placehold.co/1280x800/f1f5f9/64748b?text=${encodeURIComponent(new URL(url).hostname)}`,
      thumbnailUrl: null,
    }
  }

  const params = new URLSearchParams({
    access_key: apiKey,
    url,
    viewport_width: '1280',
    viewport_height: '800',
    full_page: 'false',
    format: 'webp',
    image_quality: '80',
    delay: '3',
    block_ads: 'true',
    block_cookie_banners: 'true',
  })

  const response = await fetch(`${apiUrl}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Screenshot API returned ${response.status} for ${url}`)
  }

  // For the seed script, we use the direct ScreenshotOne URL
  // In production, screenshots are uploaded to Supabase via captureScreenshot()
  const screenshotUrl = `${apiUrl}?${params.toString()}`

  return {
    imageUrl: screenshotUrl,
    thumbnailUrl: null,
  }
}

function placeholder(url: string): { imageUrl: string; thumbnailUrl: string | null } {
  return {
    imageUrl: `https://placehold.co/1280x800/f1f5f9/64748b?text=${encodeURIComponent(new URL(url).hostname)}`,
    thumbnailUrl: null,
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== Website Inspirations Seed Script ===')
  console.log(`  Entries: ${WEBSITE_INSPIRATIONS_DATA.length}`)
  console.log(`  Dry run: ${DRY_RUN}`)
  console.log(`  Skip screenshots: ${SKIP_SCREENSHOTS}`)
  console.log(`  Resume mode: ${RESUME}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)
  console.log('')

  if (DRY_RUN) {
    console.log('[DRY RUN] Would insert the following entries:')
    for (const entry of WEBSITE_INSPIRATIONS_DATA) {
      console.log(
        `  ${entry.displayOrder}. ${entry.name} (${entry.url}) — ${entry.industry.join(', ')}`
      )
    }
    console.log(`\n[DRY RUN] Total: ${WEBSITE_INSPIRATIONS_DATA.length} entries`)
    return
  }

  // Connect to database
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    // Check existing entries for resume mode
    let existingUrls = new Set<string>()
    if (RESUME) {
      const existing = await db.select({ url: websiteInspirations.url }).from(websiteInspirations)
      existingUrls = new Set(existing.map((e) => e.url))
      console.log(`Found ${existingUrls.size} existing entries in DB`)
    }

    // Filter entries to process
    const toProcess = RESUME
      ? WEBSITE_INSPIRATIONS_DATA.filter((e) => !existingUrls.has(e.url))
      : WEBSITE_INSPIRATIONS_DATA

    if (toProcess.length === 0) {
      console.log('All entries already exist in the database. Nothing to do.')
      return
    }

    console.log(`Processing ${toProcess.length} entries...\n`)

    let inserted = 0
    let failed = 0
    const failures: Array<{ name: string; url: string; error: string }> = []

    // Process in batches
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} entries)...`)

      const results = await Promise.allSettled(
        batch.map(async (entry) => {
          // Get screenshot
          let screenshot: { imageUrl: string; thumbnailUrl: string | null }
          if (SKIP_SCREENSHOTS) {
            screenshot = placeholder(entry.url)
          } else {
            try {
              screenshot = await captureScreenshotForSeed(entry.url)
            } catch {
              console.warn(`  Warning: Screenshot failed for ${entry.name}, using placeholder`)
              screenshot = placeholder(entry.url)
            }
          }

          // Insert into database
          await db.insert(websiteInspirations).values({
            name: entry.name,
            url: entry.url,
            screenshotUrl: screenshot.imageUrl,
            thumbnailUrl: screenshot.thumbnailUrl,
            industry: entry.industry,
            styleTags: entry.styleTags,
            colorSamples: entry.colorSamples,
            sectionTypes: entry.sectionTypes,
            typography: entry.typography,
            layoutStyle: entry.layoutStyle,
            description: entry.description,
            displayOrder: entry.displayOrder,
            isActive: true,
          })

          return entry
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          inserted++
          console.log(`  + ${result.value.name}`)
        } else {
          failed++
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          failures.push({ name: 'unknown', url: 'unknown', error: reason })
          console.error(`  x Failed: ${reason}`)
        }
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < toProcess.length) {
        console.log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`)
        await sleep(BATCH_DELAY_MS)
      }
    }

    // Summary
    console.log('\n=== Seed Complete ===')
    console.log(`  Inserted: ${inserted}`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Skipped (resume): ${WEBSITE_INSPIRATIONS_DATA.length - toProcess.length}`)

    if (failures.length > 0) {
      console.log('\nFailed entries:')
      for (const f of failures) {
        console.log(`  - ${f.name} (${f.url}): ${f.error}`)
      }
    }

    // Verify total count
    const [_countResult] = await db
      .select({ url: websiteInspirations.url })
      .from(websiteInspirations)
      .where(eq(websiteInspirations.isActive, true))

    const total = await db
      .select({ url: websiteInspirations.url })
      .from(websiteInspirations)
      .where(eq(websiteInspirations.isActive, true))

    console.log(`\nTotal active inspirations in DB: ${total.length}`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
