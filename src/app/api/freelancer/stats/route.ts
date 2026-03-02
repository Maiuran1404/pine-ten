import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, freelancerProfiles } from '@/db/schema'
import { eq, count, sum, and, gte, inArray } from 'drizzle-orm'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireRole } from '@/lib/require-auth'

export async function GET(_request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole('FREELANCER')

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Run all queries in parallel — each uses proper WHERE clauses to hit indexes
    const [
      profile,
      activeTasksResult,
      completedTasksResult,
      pendingReviewResult,
      earningsResult,
      monthlyEarningsResult,
    ] = await Promise.all([
      // Freelancer profile
      db
        .select({
          rating: freelancerProfiles.rating,
          completedTasksCount: freelancerProfiles.completedTasks,
        })
        .from(freelancerProfiles)
        .where(eq(freelancerProfiles.userId, user.id))
        .limit(1),

      // Active tasks — uses tasks_freelancer_status_idx
      db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, user.id),
            inArray(tasks.status, ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED'])
          )
        ),

      // Completed tasks — uses tasks_freelancer_status_idx
      db
        .select({ count: count() })
        .from(tasks)
        .where(and(eq(tasks.freelancerId, user.id), eq(tasks.status, 'COMPLETED'))),

      // Pending review — uses tasks_freelancer_status_idx
      db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, user.id),
            inArray(tasks.status, ['IN_REVIEW', 'PENDING_ADMIN_REVIEW'])
          )
        ),

      // Total earnings
      db
        .select({ totalEarnings: sum(tasks.creditsUsed) })
        .from(tasks)
        .where(and(eq(tasks.freelancerId, user.id), eq(tasks.status, 'COMPLETED'))),

      // Monthly earnings
      db
        .select({
          monthlyEarnings: sum(tasks.creditsUsed),
          monthlyTasks: count(),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, user.id),
            eq(tasks.status, 'COMPLETED'),
            gte(tasks.completedAt, startOfMonth)
          )
        ),
    ])

    return successResponse({
      activeTasks: Number(activeTasksResult[0]?.count) || 0,
      completedTasks: Number(completedTasksResult[0]?.count) || 0,
      pendingReview: Number(pendingReviewResult[0]?.count) || 0,
      rating: profile.length ? Number(profile[0].rating) : null,
      totalEarnings: Number(earningsResult[0]?.totalEarnings) || 0,
      monthlyEarnings: Number(monthlyEarningsResult[0]?.monthlyEarnings) || 0,
      monthlyTasks: Number(monthlyEarningsResult[0]?.monthlyTasks) || 0,
    })
  })
}
