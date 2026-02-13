import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { db } from '../src/db'
import { deliverableStyleReferences } from '../src/db/schema'
import { desc } from 'drizzle-orm'

async function check() {
  const refs = await db
    .select({
      name: deliverableStyleReferences.name,
      type: deliverableStyleReferences.deliverableType,
      style: deliverableStyleReferences.styleAxis,
    })
    .from(deliverableStyleReferences)
    .orderBy(desc(deliverableStyleReferences.createdAt))
    .limit(10)

  console.log('Latest 10 imported references:')
  refs.forEach((r, i) => {
    console.log(i + 1 + '. ' + r.name + ' (' + r.type + '/' + r.style + ')')
  })

  const total = await db
    .select({ id: deliverableStyleReferences.id })
    .from(deliverableStyleReferences)
  console.log('\nTotal count: ' + total.length)
}

check().then(() => process.exit(0))
