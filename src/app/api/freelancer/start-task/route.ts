import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { notify } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { claimTaskSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const { taskId } = claimTaskSchema.parse(await request.json())

      // Verify the task exists and is assigned to this freelancer
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.freelancerId, user.id)))
        .limit(1)

      if (!task) {
        throw Errors.notFound('Task')
      }

      // Check task is in ASSIGNED status
      if (task.status !== 'ASSIGNED') {
        throw Errors.badRequest('Task must be in ASSIGNED status to start')
      }

      // Update task status to IN_PROGRESS
      await db
        .update(tasks)
        .set({
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))

      // Notify the client that work has started
      try {
        const freelancer = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1)

        await notify({
          userId: task.clientId,
          type: 'TASK_ASSIGNED',
          title: 'Work Started',
          content: `${freelancer[0]?.name || 'Your designer'} has started working on "${task.title}".`,
          taskId: task.id,
          taskUrl: `${config.app.url}/dashboard/tasks/${task.id}`,
          additionalData: {
            taskTitle: task.title,
          },
        })
      } catch (notifyError) {
        logger.error({ error: notifyError }, 'Failed to send start notification')
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/freelancer/start-task' }
  )
}
