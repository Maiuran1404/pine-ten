import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, taskMessages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notify } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { taskRevisionSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const { id } = await params
    const body = await request.json()
    const { feedback } = taskRevisionSchema.parse(body)

    // Get the task
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    if (!taskResult.length) {
      throw Errors.notFound('Task')
    }

    const task = taskResult[0]

    // Only the client who owns the task can request revision
    if (task.clientId !== session.user.id) {
      throw Errors.forbidden()
    }

    // Task must be in IN_REVIEW status to request revision
    if (task.status !== 'IN_REVIEW') {
      throw Errors.badRequest('Task must be in review to request revision')
    }

    // Check if revision limit reached
    if (task.revisionsUsed >= task.maxRevisions) {
      throw Errors.badRequest('Maximum revisions reached. Please contact support.')
    }

    // Update task status to REVISION_REQUESTED and increment revision count
    await db
      .update(tasks)
      .set({
        status: 'REVISION_REQUESTED',
        revisionsUsed: task.revisionsUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))

    // Add the revision feedback as a message
    await db.insert(taskMessages).values({
      taskId: id,
      senderId: session.user.id,
      content: `Revision requested: ${feedback}`,
      attachments: [],
    })

    // Notify the freelancer
    if (task.freelancerId) {
      try {
        await notify({
          userId: task.freelancerId,
          type: 'REVISION_REQUESTED',
          title: 'Revision Requested',
          content: `The client has requested changes on "${task.title}": ${feedback.substring(0, 100)}${feedback.length > 100 ? '...' : ''}`,
          taskId: task.id,
          taskUrl: `${config.app.url}/portal/tasks/${task.id}`,
          additionalData: {
            taskTitle: task.title,
            feedback,
          },
        })
      } catch (error) {
        logger.error({ error }, 'Failed to send revision notification')
      }
    }

    return successResponse({
      success: true,
      message: 'Revision requested successfully',
      revisionsUsed: task.revisionsUsed + 1,
      maxRevisions: task.maxRevisions,
    })
  })
}
