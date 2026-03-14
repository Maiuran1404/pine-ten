import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { getFailedJobs, retryFailedJob, removeFailedJob } from '@/lib/queue/monitoring'
import { QUEUE_NAMES, type QueueName } from '@/lib/queue/types'

const actionSchema = z.object({
  action: z.enum(['retry', 'remove']),
  jobId: z.string().min(1),
})

function validateQueueName(queueName: string): QueueName {
  if (!QUEUE_NAMES.includes(queueName as QueueName)) {
    throw Errors.badRequest(`Invalid queue name: ${queueName}`)
  }
  return queueName as QueueName
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { queueName } = await params
      const name = validateQueueName(queueName)

      const searchParams = request.nextUrl.searchParams
      const start = Number(searchParams.get('start') ?? 0)
      const end = Number(searchParams.get('end') ?? 50)

      const failedJobs = await getFailedJobs(name, start, end)

      return successResponse({ failedJobs })
    },
    { endpoint: 'GET /api/admin/queues/[queueName]/dead-letter' }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { queueName } = await params
      const name = validateQueueName(queueName)

      const body = actionSchema.parse(await request.json())

      let success: boolean
      if (body.action === 'retry') {
        success = await retryFailedJob(name, body.jobId)
      } else {
        success = await removeFailedJob(name, body.jobId)
      }

      if (!success) {
        throw Errors.notFound('Job')
      }

      return successResponse({ success: true, action: body.action, jobId: body.jobId })
    },
    { endpoint: 'POST /api/admin/queues/[queueName]/dead-letter' }
  )
}
