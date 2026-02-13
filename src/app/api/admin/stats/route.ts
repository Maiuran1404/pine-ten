import { db } from '@/db'
import { users, tasks, freelancerProfiles, creditTransactions } from '@/db/schema'
import { eq, count, sum, notInArray } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling } from '@/lib/errors'
import { cachedSuccessResponse, CacheDurations } from '@/lib/cache'
import { logger } from '@/lib/logger'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Helper for safe queries
      const safeQuery = async <T>(name: string, query: Promise<T>, defaultValue: T): Promise<T> => {
        try {
          return await query
        } catch (err) {
          logger.error({ err, queryName: name }, `Failed to query ${name}`)
          return defaultValue
        }
      }

      // Run all 6 queries in parallel
      const [
        clientsResult,
        freelancersResult,
        pendingResult,
        activeTasksResult,
        completedTasksResult,
        revenueResult,
      ] = await Promise.all([
        safeQuery(
          'clients',
          db.select({ count: count() }).from(users).where(eq(users.role, 'CLIENT')),
          [{ count: 0 }]
        ),
        safeQuery(
          'freelancers',
          db
            .select({ count: count() })
            .from(freelancerProfiles)
            .where(eq(freelancerProfiles.status, 'APPROVED')),
          [{ count: 0 }]
        ),
        safeQuery(
          'pending',
          db
            .select({ count: count() })
            .from(freelancerProfiles)
            .where(eq(freelancerProfiles.status, 'PENDING')),
          [{ count: 0 }]
        ),
        safeQuery(
          'activeTasks',
          db
            .select({ count: count() })
            .from(tasks)
            .where(notInArray(tasks.status, ['COMPLETED', 'CANCELLED'])),
          [{ count: 0 }]
        ),
        safeQuery(
          'completedTasks',
          db.select({ count: count() }).from(tasks).where(eq(tasks.status, 'COMPLETED')),
          [{ count: 0 }]
        ),
        safeQuery(
          'revenue',
          db
            .select({ total: sum(creditTransactions.amount) })
            .from(creditTransactions)
            .where(eq(creditTransactions.type, 'PURCHASE')),
          [{ total: '0' }]
        ),
      ])

      // $49 per credit
      const totalRevenue = (Number(revenueResult[0]?.total) || 0) * 49

      return cachedSuccessResponse(
        {
          totalClients: Number(clientsResult[0]?.count) || 0,
          totalFreelancers: Number(freelancersResult[0]?.count) || 0,
          pendingApprovals: Number(pendingResult[0]?.count) || 0,
          activeTasks: Number(activeTasksResult[0]?.count) || 0,
          completedTasks: Number(completedTasksResult[0]?.count) || 0,
          totalRevenue,
        },
        CacheDurations.SHORT,
        { isPrivate: true, staleWhileRevalidate: CacheDurations.SHORT }
      )
    },
    { endpoint: 'GET /api/admin/stats' }
  )
}
