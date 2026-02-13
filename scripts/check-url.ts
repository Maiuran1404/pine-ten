#!/usr/bin/env npx tsx
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('../src/db')
  const { deliverableStyleReferences } = await import('../src/db/schema')
  const { desc, like } = await import('drizzle-orm')

  const recent = await db
    .select({
      imageUrl: deliverableStyleReferences.imageUrl,
      name: deliverableStyleReferences.name,
    })
    .from(deliverableStyleReferences)
    .where(like(deliverableStyleReferences.imageUrl, '%bigged%'))
    .orderBy(desc(deliverableStyleReferences.createdAt))
    .limit(1)

  if (recent[0]?.imageUrl) {
    const url = recent[0].imageUrl
    console.log('Name:', recent[0].name)
    console.log('Testing URL:', url)

    const res = await fetch(url, { method: 'HEAD' })
    console.log('Status:', res.status)
    console.log('Content-Type:', res.headers.get('content-type'))
    console.log('Content-Length:', res.headers.get('content-length'), 'bytes')

    if (res.status === 200) {
      console.log('\n✅ Image is accessible!')
    } else {
      console.log('\n❌ Image not accessible')
    }
  } else {
    console.log('No bigged imports found')
  }

  process.exit(0)
}

main().catch(console.error)
