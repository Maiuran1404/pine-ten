import { type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { getQueueMetrics, getFailedJobs } from '@/lib/queue/monitoring'
import { QUEUE_NAMES, type QueueName } from '@/lib/queue/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { queueName } = await params

      if (!QUEUE_NAMES.includes(queueName as QueueName)) {
        throw Errors.badRequest(`Invalid queue name: ${queueName}`)
      }

      const name = queueName as QueueName
      const [metrics, failedJobs] = await Promise.all([
        getQueueMetrics(name),
        getFailedJobs(name, 0, 50),
      ])

      return successResponse({ metrics, failedJobs })
    },
    { endpoint: 'GET /api/admin/queues/[queueName]' }
  )
}
