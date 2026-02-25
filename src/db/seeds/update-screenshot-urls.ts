/**
 * One-off script to manage website_inspirations data.
 *
 * Usage:
 *   npx tsx src/db/seeds/update-screenshot-urls.ts          # Update screenshot URLs
 *   npx tsx src/db/seeds/update-screenshot-urls.ts --clear   # Clear all entries then reseed
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { websiteInspirations } from '../schema'
import { WEBSITE_INSPIRATIONS_DATA } from './website-inspirations-data'

const CLEAR_MODE = process.argv.includes('--clear')

function screenshotUrl(siteUrl: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(siteUrl)}&screenshot=true&meta=false&embed=screenshot.url`
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const client = postgres(databaseUrl, { prepare: false, ssl: 'require', max: 5 })
  const db = drizzle(client)

  try {
    if (CLEAR_MODE) {
      // Clear all existing entries
      const deleted = await db.delete(websiteInspirations).returning({ id: websiteInspirations.id })
      console.log(`Cleared ${deleted.length} existing entries`)

      // Insert fresh data with microlink screenshot URLs
      console.log(`Inserting ${WEBSITE_INSPIRATIONS_DATA.length} entries...`)
      let inserted = 0
      for (const entry of WEBSITE_INSPIRATIONS_DATA) {
        await db.insert(websiteInspirations).values({
          name: entry.name,
          url: entry.url,
          screenshotUrl: screenshotUrl(entry.url),
          thumbnailUrl: null,
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
        inserted++
        console.log(`  + ${entry.name} (${entry.url})`)
      }
      console.log(`\nDone. Inserted ${inserted} entries.`)
    } else {
      console.log('No --clear flag provided. Nothing to do.')
      console.log('Usage: npx tsx src/db/seeds/update-screenshot-urls.ts --clear')
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Update script failed:', err)
  process.exit(1)
})
