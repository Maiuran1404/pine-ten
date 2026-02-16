import { db } from '@/db'
import { chatTestRuns } from '@/db/schema'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { chatTestScenarios } from '@/lib/ai/chat-test-scenarios'
import { desc, sql } from 'drizzle-orm'

/**
 * POST /api/admin/chat-tests — Create a new batch of 10 chat test runs
 */
export async function POST() {
  return withErrorHandling(
    async () => {
      const session = await requireAdmin()

      const batchId = crypto.randomUUID()

      const rows = chatTestScenarios.map((scenario) => ({
        batchId,
        triggeredBy: session.user.id,
        status: 'pending' as const,
        scenarioName: scenario.name,
        scenarioConfig: {
          name: scenario.name,
          companyName: scenario.companyName,
          industry: scenario.industry,
          platform: scenario.platform,
          contentType: scenario.contentType,
          intent: scenario.intent,
          openingMessage: scenario.openingMessage,
        },
        messages: [],
      }))

      const inserted = await db.insert(chatTestRuns).values(rows).returning({
        id: chatTestRuns.id,
        scenarioName: chatTestRuns.scenarioName,
        status: chatTestRuns.status,
      })

      return successResponse({ batchId, runs: inserted }, 201)
    },
    { endpoint: 'POST /api/admin/chat-tests' }
  )
}

/**
 * GET /api/admin/chat-tests — List all batches with summary stats
 */
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const batches = await db
        .select({
          batchId: chatTestRuns.batchId,
          triggeredBy: chatTestRuns.triggeredBy,
          createdAt: sql<string>`MIN(${chatTestRuns.createdAt})`.as('created_at'),
          totalRuns: sql<number>`COUNT(*)::int`.as('total_runs'),
          completedRuns:
            sql<number>`COUNT(*) FILTER (WHERE ${chatTestRuns.status} = 'completed')::int`.as(
              'completed_runs'
            ),
          failedRuns:
            sql<number>`COUNT(*) FILTER (WHERE ${chatTestRuns.status} = 'failed')::int`.as(
              'failed_runs'
            ),
          runningRuns:
            sql<number>`COUNT(*) FILTER (WHERE ${chatTestRuns.status} = 'running')::int`.as(
              'running_runs'
            ),
          pendingRuns:
            sql<number>`COUNT(*) FILTER (WHERE ${chatTestRuns.status} = 'pending')::int`.as(
              'pending_runs'
            ),
          reachedReviewCount:
            sql<number>`COUNT(*) FILTER (WHERE ${chatTestRuns.reachedReview} = true)::int`.as(
              'reached_review_count'
            ),
          avgTurns:
            sql<number>`ROUND(AVG(${chatTestRuns.totalTurns}) FILTER (WHERE ${chatTestRuns.status} = 'completed'), 1)`.as(
              'avg_turns'
            ),
          avgDurationMs:
            sql<number>`ROUND(AVG(${chatTestRuns.durationMs}) FILTER (WHERE ${chatTestRuns.status} = 'completed'))::int`.as(
              'avg_duration_ms'
            ),
        })
        .from(chatTestRuns)
        .groupBy(chatTestRuns.batchId, chatTestRuns.triggeredBy)
        .orderBy(desc(sql`MIN(${chatTestRuns.createdAt})`))
        .limit(20)

      return successResponse(batches)
    },
    { endpoint: 'GET /api/admin/chat-tests' }
  )
}
