import { NextRequest } from 'next/server'
import { db } from '@/db'
import { chatTestRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

/**
 * GET /api/admin/chat-tests/runs/[runId] — Get a single run with all messages
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { runId } = await params

      const [run] = await db.select().from(chatTestRuns).where(eq(chatTestRuns.id, runId)).limit(1)

      if (!run) {
        throw Errors.notFound('Chat test run')
      }

      return successResponse(run)
    },
    { endpoint: 'GET /api/admin/chat-tests/runs/[runId]' }
  )
}
