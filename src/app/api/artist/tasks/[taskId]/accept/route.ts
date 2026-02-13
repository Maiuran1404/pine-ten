import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { withTransaction } from '@/db'
import { tasks, taskOffers, taskActivityLog, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { notify } from '@/lib/notifications'
import { config } from '@/lib/config'

/**
 * POST /api/artist/tasks/[taskId]/accept
 * Accept a task offer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withErrorHandling(
    async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      if (!session?.user) {
        throw Errors.unauthorized()
      }

      const { taskId } = await params

      // Verify the user is a freelancer
      const user = session.user as { role?: string }
      if (user.role !== 'FREELANCER' && user.role !== 'ADMIN') {
        throw Errors.forbidden('Only artists can accept task offers')
      }

      const result = await withTransaction(async (tx) => {
        // Get the task with its current offer
        const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).for('update')

        if (!task) {
          throw Errors.notFound('Task')
        }

        // Check if the task is offered to this user
        if (task.offeredTo !== session.user.id) {
          throw Errors.forbidden('This task is not offered to you')
        }

        // Check if the offer is still valid
        if (task.status !== 'OFFERED') {
          throw Errors.badRequest('This offer is no longer valid')
        }

        if (task.offerExpiresAt && new Date(task.offerExpiresAt) < new Date()) {
          throw Errors.badRequest('This offer has expired')
        }

        // Accept the offer
        const [updatedTask] = await tx
          .update(tasks)
          .set({
            status: 'ASSIGNED',
            freelancerId: session.user.id,
            assignedAt: new Date(),
            offeredTo: null,
            offerExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))
          .returning()

        // Update the offer record
        await tx
          .update(taskOffers)
          .set({
            response: 'ACCEPTED',
            respondedAt: new Date(),
          })
          .where(
            and(
              eq(taskOffers.taskId, taskId),
              eq(taskOffers.artistId, session.user.id),
              eq(taskOffers.response, 'PENDING')
            )
          )

        // Log the activity
        await tx.insert(taskActivityLog).values({
          taskId,
          actorId: session.user.id,
          actorType: 'freelancer',
          action: 'accepted',
          previousStatus: 'OFFERED',
          newStatus: 'ASSIGNED',
          metadata: {
            acceptedAt: new Date().toISOString(),
          },
        })

        // Get client info for notification
        const [client] = await tx
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, task.clientId))

        return { task: updatedTask, client }
      })

      // Send notification to client
      try {
        await notify({
          userId: result.task.clientId,
          type: 'TASK_ASSIGNED',
          title: 'Artist Assigned to Your Task',
          content: `${session.user.name} has accepted your task: ${result.task.title}`,
          taskId: result.task.id,
          taskUrl: `${config.app.url}/dashboard/tasks/${result.task.id}`,
          additionalData: {
            taskTitle: result.task.title,
            artistName: session.user.name,
          },
        })
      } catch (error) {
        logger.error({ error, taskId }, 'Failed to send client notification')
      }

      logger.info(
        {
          taskId,
          artistId: session.user.id,
          artistName: session.user.name,
        },
        'Task offer accepted'
      )

      return successResponse({
        message: 'Task accepted successfully',
        task: {
          id: result.task.id,
          title: result.task.title,
          status: result.task.status,
        },
      })
    },
    { endpoint: 'POST /api/artist/tasks/[taskId]/accept' }
  )
}
