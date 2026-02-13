import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, taskMessages, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notify } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { taskMessageSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

// GET - Fetch messages for a task
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const { id } = await params

    // Get the task to verify permissions
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    if (!taskResult.length) {
      throw Errors.notFound('Task')
    }

    const task = taskResult[0]
    const user = session.user as { role?: string }

    // Check permissions
    if (
      user.role !== 'ADMIN' &&
      task.clientId !== session.user.id &&
      task.freelancerId !== session.user.id
    ) {
      throw Errors.forbidden()
    }

    // Get messages
    const messages = await db
      .select({
        id: taskMessages.id,
        content: taskMessages.content,
        attachments: taskMessages.attachments,
        createdAt: taskMessages.createdAt,
        senderId: taskMessages.senderId,
        senderName: users.name,
        senderImage: users.image,
      })
      .from(taskMessages)
      .leftJoin(users, eq(taskMessages.senderId, users.id))
      .where(eq(taskMessages.taskId, id))
      .orderBy(taskMessages.createdAt)

    return successResponse({ messages })
  })
}

// POST - Send a new message
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const session = await requireAuth()

    const { id } = await params
    const body = await request.json()
    const { content, attachments } = taskMessageSchema.parse(body)

    // Get the task to verify permissions
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)

    if (!taskResult.length) {
      throw Errors.notFound('Task')
    }

    const task = taskResult[0]
    const user = session.user as { role?: string }

    // Check permissions - only client, freelancer, or admin can message
    if (
      user.role !== 'ADMIN' &&
      task.clientId !== session.user.id &&
      task.freelancerId !== session.user.id
    ) {
      throw Errors.forbidden()
    }

    // Insert the message
    const [newMessage] = await db
      .insert(taskMessages)
      .values({
        taskId: id,
        senderId: session.user.id,
        content: content.trim(),
        attachments: attachments,
      })
      .returning()

    // Notify the other party
    const isClient = task.clientId === session.user.id
    const recipientId = isClient ? task.freelancerId : task.clientId

    if (recipientId) {
      try {
        await notify({
          userId: recipientId,
          type: 'NEW_MESSAGE',
          title: 'New Message',
          content: `${session.user.name || 'Someone'} sent you a message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          taskId: task.id,
          taskUrl: isClient
            ? `${config.app.url}/portal/tasks/${task.id}`
            : `${config.app.url}/dashboard/tasks/${task.id}`,
          additionalData: {
            taskTitle: task.title,
            senderName: session.user.name || 'Unknown',
          },
        })
      } catch (error) {
        logger.error({ error }, 'Failed to send message notification')
      }
    }

    // Get the full message with sender info
    const messageWithSender = await db
      .select({
        id: taskMessages.id,
        content: taskMessages.content,
        attachments: taskMessages.attachments,
        createdAt: taskMessages.createdAt,
        senderId: taskMessages.senderId,
        senderName: users.name,
        senderImage: users.image,
      })
      .from(taskMessages)
      .leftJoin(users, eq(taskMessages.senderId, users.id))
      .where(eq(taskMessages.id, newMessage.id))
      .limit(1)

    return successResponse({
      success: true,
      message: messageWithSender[0],
    })
  })
}
