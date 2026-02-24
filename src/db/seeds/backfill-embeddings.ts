/**
 * Backfill CLIP embeddings for website inspirations.
 *
 * Usage: npx tsx src/db/seeds/backfill-embeddings.ts
 *
 * Options:
 *   --dry-run         Preview what would be processed without generating embeddings
 *   --batch-size N    Number of concurrent embedding requests per batch (default: 3)
 *   --limit N         Only process first N unembedded inspirations (for testing)
 *   --force           Re-generate embeddings even for rows that already have them
 *
 * Requires:
 *   CLIP_API_KEY      Replicate API key for CLIP model
 *   DATABASE_URL      PostgreSQL connection string
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'

// Parse CLI args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')
const BATCH_SIZE = (() => {
  const idx = args.indexOf('--batch-size')
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10)
  return 3
})()
const LIMIT = (() => {
  const idx = args.indexOf('--limit')
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10)
  return 0 // 0 = no limit
})()
const BATCH_DELAY_MS = 1500

interface PredictionResponse {
  status: string
  error?: string
  output?: number[]
  urls: { get: string }
}

/**
 * Generate CLIP embedding for a single image URL via Replicate API.
 * Inline implementation to avoid importing server-only modules.
 */
async function generateEmbedding(
  imageUrl: string,
  apiKey: string,
  apiUrl: string
): Promise<number[] | null> {
  const createResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'openai/clip-vit-large-patch14',
      input: { image: imageUrl },
    }),
  })

  if (!createResponse.ok) {
    throw new Error(
      `Replicate API returned ${createResponse.status}: ${await createResponse.text()}`
    )
  }

  let result = (await createResponse.json()) as PredictionResponse

  // Poll for completion (max 30 seconds)
  const maxAttempts = 15
  for (let i = 0; i < maxAttempts; i++) {
    if (result.status === 'succeeded') break
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Prediction ${result.status}: ${result.error || 'unknown error'}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const pollResponse = await fetch(result.urls.get, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    result = (await pollResponse.json()) as PredictionResponse
  }

  if (result.status !== 'succeeded') {
    throw new Error('Prediction timed out')
  }

  return (result.output as number[]) ?? null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== CLIP Embedding Backfill Script ===')
  console.log(`  Dry run: ${DRY_RUN}`)
  console.log(`  Force re-generate: ${FORCE}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)
  console.log(`  Limit: ${LIMIT || 'none'}`)
  console.log('')

  // Validate env
  const apiKey = process.env.CLIP_API_KEY
  const apiUrl = process.env.CLIP_API_URL || 'https://api.replicate.com/v1/predictions'
  const databaseUrl = process.env.DATABASE_URL

  if (!apiKey && !DRY_RUN) {
    console.error('ERROR: CLIP_API_KEY environment variable is required (or use --dry-run)')
    process.exit(1)
  }

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    // Check if pgvector extension and column exist
    try {
      await db.execute(sql.raw(`SELECT embedding_vector FROM website_inspirations LIMIT 0`))
    } catch {
      console.error(
        'ERROR: embedding_vector column does not exist. Run the migration first:\n' +
          '  psql $DATABASE_URL -f src/db/migrations/add-embedding-vector.sql'
      )
      process.exit(1)
    }

    // Query inspirations that need embeddings
    const whereClause = FORCE
      ? 'WHERE is_active = true'
      : 'WHERE is_active = true AND embedding_vector IS NULL'
    const limitClause = LIMIT > 0 ? `LIMIT ${LIMIT}` : ''

    const result = await db.execute(
      sql.raw(`
        SELECT id, name, screenshot_url
        FROM website_inspirations
        ${whereClause}
        ORDER BY display_order
        ${limitClause}
      `)
    )

    const inspirations = result.rows as Array<{
      id: string
      name: string
      screenshot_url: string
    }>

    if (inspirations.length === 0) {
      console.log('All active inspirations already have embeddings. Nothing to do.')
      return
    }

    console.log(`Found ${inspirations.length} inspirations to process\n`)

    if (DRY_RUN) {
      console.log('[DRY RUN] Would generate embeddings for:')
      for (const insp of inspirations) {
        console.log(`  - ${insp.name} (${insp.id})`)
      }
      console.log(`\n[DRY RUN] Total: ${inspirations.length} embeddings`)
      return
    }

    let succeeded = 0
    let failed = 0
    const failures: Array<{ name: string; id: string; error: string }> = []

    // Process in batches
    for (let i = 0; i < inspirations.length; i += BATCH_SIZE) {
      const batch = inspirations.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(inspirations.length / BATCH_SIZE)

      console.log(`Batch ${batchNum}/${totalBatches} (${batch.length} items)...`)

      const batchResults = await Promise.allSettled(
        batch.map(async (insp) => {
          const vector = await generateEmbedding(insp.screenshot_url, apiKey!, apiUrl)

          if (!vector) {
            throw new Error('No vector returned from embedding API')
          }

          // Update the row with the embedding vector
          const vectorStr = `[${vector.join(',')}]`
          await db.execute(
            sql.raw(
              `UPDATE website_inspirations SET embedding_vector = '${vectorStr}'::vector WHERE id = '${insp.id}'`
            )
          )

          return insp
        })
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          succeeded++
          console.log(`  + ${result.value.name} (${result.value.id})`)
        } else {
          failed++
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          failures.push({ name: 'unknown', id: 'unknown', error: reason })
          console.error(`  x Failed: ${reason}`)
        }
      }

      // Rate limit delay between batches
      if (i + BATCH_SIZE < inspirations.length) {
        console.log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`)
        await sleep(BATCH_DELAY_MS)
      }
    }

    // Summary
    console.log('\n=== Backfill Complete ===')
    console.log(`  Succeeded: ${succeeded}`)
    console.log(`  Failed: ${failed}`)

    if (failures.length > 0) {
      console.log('\nFailed entries:')
      for (const f of failures) {
        console.log(`  - ${f.name} (${f.id}): ${f.error}`)
      }
    }

    // Verify total count
    const countResult = await db.execute(
      sql.raw(`
        SELECT
          COUNT(*) FILTER (WHERE embedding_vector IS NOT NULL) as with_embeddings,
          COUNT(*) as total
        FROM website_inspirations
        WHERE is_active = true
      `)
    )

    const counts = countResult.rows[0] as { with_embeddings: string; total: string }
    console.log(
      `\nEmbedding coverage: ${counts.with_embeddings}/${counts.total} active inspirations`
    )
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Backfill script failed:', err)
  process.exit(1)
})
