import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { getAllQueueMetrics } from '@/lib/queue/monitoring'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const metrics = await getAllQueueMetrics()

      return successResponse({ queues: metrics })
    },
    { endpoint: 'GET /api/admin/queues' }
  )
}
