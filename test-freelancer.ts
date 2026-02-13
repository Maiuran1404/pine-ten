import { db } from './src/db'
import { users, freelancerProfiles, tasks } from './src/db/schema'
import { eq, count } from 'drizzle-orm'

async function test() {
  const id = 'vjczHtQ3cJm8x6MV76PXF1NGMwgARWEM'

  console.log('=== Testing API logic for ID:', id, '===\n')

  // Step 1: Try to find by profile ID
  console.log('Step 1: Query by profile ID...')
  let freelancerResult = await db
    .select({
      id: freelancerProfiles.id,
      userId: freelancerProfiles.userId,
      status: freelancerProfiles.status,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(users.id, freelancerProfiles.userId))
    .where(eq(freelancerProfiles.id, id))
    .limit(1)
  console.log('Result:', freelancerResult)

  // Step 2: If not found by profile ID, try by user ID
  if (freelancerResult.length === 0) {
    console.log('\nStep 2: Query by user ID...')
    freelancerResult = await db
      .select({
        id: freelancerProfiles.id,
        userId: freelancerProfiles.userId,
        status: freelancerProfiles.status,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(freelancerProfiles)
      .innerJoin(users, eq(users.id, freelancerProfiles.userId))
      .where(eq(freelancerProfiles.userId, id))
      .limit(1)
    console.log('Result:', freelancerResult)
  }

  // Step 3: If still not found, check if user exists but has no profile
  if (freelancerResult.length === 0) {
    console.log('\nStep 3: Query user directly...')
    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    console.log('Result:', userResult)

    if (userResult.length === 0 || userResult[0].role !== 'FREELANCER') {
      console.log('\n❌ User not found or not a FREELANCER')
    } else {
      console.log('\n✅ User found! Should return NOT_ONBOARDED response')
      const user = userResult[0]
      console.log('Response would be:', {
        id: user.id,
        userId: user.id,
        status: 'NOT_ONBOARDED',
        skills: [],
        specializations: [],
        portfolioUrls: [],
        bio: null,
        timezone: null,
        hourlyRate: null,
        rating: null,
        completedTasks: 0,
        whatsappNumber: null,
        availability: true,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
        },
        taskCounts: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          inReview: 0,
        },
        recentTasks: [],
      })
    }
  }

  process.exit(0)
}

test().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
