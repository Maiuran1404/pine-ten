import { NextRequest } from 'next/server'
import { db } from '@/db'
import { chatTestRuns } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'

/**
 * GET /api/admin/chat-tests/[batchId] — Get all runs for a batch
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { batchId } = await params

      const runs = await db.select().from(chatTestRuns).where(eq(chatTestRuns.batchId, batchId))

      if (runs.length === 0) {
        throw Errors.notFound('Batch')
      }

      return successResponse({ batchId, runs })
    },
    { endpoint: 'GET /api/admin/chat-tests/[batchId]' }
  )
}

/**
 * DELETE /api/admin/chat-tests/[batchId] — Delete all runs for a batch
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { batchId } = await params

      const deleted = await db
        .delete(chatTestRuns)
        .where(eq(chatTestRuns.batchId, batchId))
        .returning({ id: chatTestRuns.id })

      if (deleted.length === 0) {
        throw Errors.notFound('Batch')
      }

      return successResponse({ batchId, deletedCount: deleted.length })
    },
    { endpoint: 'DELETE /api/admin/chat-tests/[batchId]' }
  )
}
