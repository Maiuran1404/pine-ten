import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db } from '@/db'
import {
  securityTests,
  securityTestRuns,
  securitySnapshots,
  testSchedules,
  testUsers,
} from '@/db/schema'
import { desc, count, eq, gte, sql } from 'drizzle-orm'

// GET - Get security overview dashboard data
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Get data in parallel
      const [latestSnapshot, recentRuns, activeSchedules, testCounts, testUsersList, last24hRuns] =
        await Promise.all([
          // Latest security snapshot
          db.select().from(securitySnapshots).orderBy(desc(securitySnapshots.createdAt)).limit(1),

          // Recent test runs (last 10)
          db
            .select({
              id: securityTestRuns.id,
              status: securityTestRuns.status,
              targetUrl: securityTestRuns.targetUrl,
              environment: securityTestRuns.environment,
              totalTests: securityTestRuns.totalTests,
              passedTests: securityTestRuns.passedTests,
              failedTests: securityTestRuns.failedTests,
              errorTests: securityTestRuns.errorTests,
              score: securityTestRuns.score,
              startedAt: securityTestRuns.startedAt,
              completedAt: securityTestRuns.completedAt,
              durationMs: securityTestRuns.durationMs,
              createdAt: securityTestRuns.createdAt,
            })
            .from(securityTestRuns)
            .orderBy(desc(securityTestRuns.createdAt))
            .limit(10),

          // Active schedules
          db
            .select()
            .from(testSchedules)
            .where(eq(testSchedules.isActive, true))
            .orderBy(desc(testSchedules.createdAt)),

          // Test counts by category
          db
            .select({
              category: securityTests.category,
              count: count(),
            })
            .from(securityTests)
            .where(eq(securityTests.isActive, true))
            .groupBy(securityTests.category),

          // Test users
          db.select().from(testUsers).where(eq(testUsers.isActive, true)),

          // Runs in last 24 hours
          db
            .select({
              count: count(),
            })
            .from(securityTestRuns)
            .where(gte(securityTestRuns.createdAt, sql`now() - interval '24 hours'`)),
        ])

      // Calculate summary stats
      const totalTests = testCounts.reduce((sum, c) => sum + Number(c.count), 0)
      const lastRun = recentRuns[0]
      const runsLast24h = last24hRuns[0]?.count || 0

      // Get pass rate from recent runs
      const passRate =
        recentRuns.length > 0
          ? recentRuns.reduce((sum, run) => {
              if (run.totalTests === 0) return sum
              return sum + (run.passedTests / run.totalTests) * 100
            }, 0) / recentRuns.filter((r) => r.totalTests > 0).length
          : null

      return successResponse({
        snapshot: latestSnapshot[0] || null,
        recentRuns,
        schedules: activeSchedules,
        testCategories: testCounts,
        testUsers: testUsersList,
        summary: {
          totalTests,
          activeSchedules: activeSchedules.length,
          testUsers: testUsersList.length,
          runsLast24h: Number(runsLast24h),
          lastRunAt: lastRun?.createdAt || null,
          lastRunScore: lastRun?.score ? Number(lastRun.score) : null,
          averagePassRate: passRate ? Math.round(passRate * 10) / 10 : null,
        },
      })
    },
    { endpoint: 'GET /api/admin/security' }
  )
}
