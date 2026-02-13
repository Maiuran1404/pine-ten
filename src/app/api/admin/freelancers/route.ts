import { NextRequest } from 'next/server'
import { db } from '@/db'
import { freelancerProfiles, users } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'

export async function GET(_request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Get all users with FREELANCER role, left joining their profiles
      // This shows artists who haven't completed onboarding too
      const freelancers = await db
        .select({
          id: freelancerProfiles.id,
          odUserId: users.id,
          status: freelancerProfiles.status,
          skills: freelancerProfiles.skills,
          specializations: freelancerProfiles.specializations,
          portfolioUrls: freelancerProfiles.portfolioUrls,
          bio: freelancerProfiles.bio,
          completedTasks: freelancerProfiles.completedTasks,
          rating: freelancerProfiles.rating,
          profileCreatedAt: freelancerProfiles.createdAt,
          userCreatedAt: users.createdAt,
          user: {
            name: users.name,
            email: users.email,
          },
        })
        .from(users)
        .leftJoin(freelancerProfiles, eq(users.id, freelancerProfiles.userId))
        .where(eq(users.role, 'FREELANCER'))
        .orderBy(desc(users.createdAt))

      // Transform the data to handle users without profiles
      const transformedFreelancers = freelancers.map((f) => ({
        id: f.id || f.odUserId, // Use profile ID if exists, otherwise user ID
        userId: f.odUserId,
        status: f.status || 'NOT_ONBOARDED', // Show as not onboarded if no profile
        skills: f.skills || [],
        specializations: f.specializations || [],
        portfolioUrls: f.portfolioUrls || [],
        bio: f.bio,
        completedTasks: f.completedTasks || 0,
        rating: f.rating,
        createdAt: f.profileCreatedAt || f.userCreatedAt,
        user: f.user,
      }))

      return successResponse({ freelancers: transformedFreelancers })
    },
    { endpoint: 'GET /api/admin/freelancers' }
  )
}
