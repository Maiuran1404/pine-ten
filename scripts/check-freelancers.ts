import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { pgTable, text, boolean, uuid } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const freelancerProfiles = pgTable('freelancer_profiles', {
  userId: uuid('user_id').primaryKey(),
  status: text('status'),
  availability: boolean('availability'),
})

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  email: text('email'),
})

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }

  const client = postgres(databaseUrl)
  const db = drizzle(client)

  const allProfiles = await db
    .select({
      userId: freelancerProfiles.userId,
      status: freelancerProfiles.status,
      availability: freelancerProfiles.availability,
      name: users.name,
      email: users.email,
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(freelancerProfiles.userId, users.id))

  console.log('=== All Freelancer Profiles ===')
  console.log('Total profiles:', allProfiles.length)

  allProfiles.forEach((p) => {
    console.log(`- ${p.name} (${p.email}): status=${p.status}, availability=${p.availability}`)
  })

  const approved = allProfiles.filter((p) => p.status === 'APPROVED')
  console.log('\n=== Summary ===')
  console.log('Total profiles:', allProfiles.length)
  console.log('Approved:', approved.length)
  console.log('Approved & Available:', approved.filter((p) => p.availability).length)

  await client.end()
}

main().catch(console.error)
