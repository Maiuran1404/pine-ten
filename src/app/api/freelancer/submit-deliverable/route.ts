import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, taskFiles, taskMessages, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { adminNotifications } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const body = await request.json()
      const { taskId, files, message } = body

      if (!taskId) {
        throw Errors.badRequest('Task ID is required')
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        throw Errors.badRequest('At least one file is required')
      }

      // Verify the task exists and is assigned to this freelancer
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.freelancerId, user.id)))
        .limit(1)

      if (!task) {
        throw Errors.notFound('Task')
      }

      // Check task status allows submission
      const allowedStatuses = ['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED']
      if (!allowedStatuses.includes(task.status)) {
        throw Errors.badRequest('Cannot submit deliverable for this task status')
      }

      // Save deliverable files
      await db.insert(taskFiles).values(
        files.map(
          (file: { fileName: string; fileUrl: string; fileType: string; fileSize: number }) => ({
            taskId,
            uploadedBy: user.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            fileSize: file.fileSize,
            isDeliverable: true,
          })
        )
      )

      // Add a message if provided
      if (message && message.trim()) {
        await db.insert(taskMessages).values({
          taskId,
          senderId: user.id,
          content: message,
          attachments: files.map((f: { fileUrl: string }) => f.fileUrl),
        })
      }

      // Update task status to PENDING_ADMIN_REVIEW (requires admin verification before client sees it)
      await db
        .update(tasks)
        .set({
          status: 'PENDING_ADMIN_REVIEW',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))

      // Get freelancer and client details for admin notification
      try {
        const [freelancer] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1)

        const [client] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, task.clientId))
          .limit(1)

        // Notify admin that deliverables need verification (includes Slack)
        await adminNotifications.deliverablePendingReview({
          taskId: task.id,
          taskTitle: task.title,
          freelancerName: freelancer?.name || 'Unknown',
          freelancerEmail: freelancer?.email || '',
          clientName: client?.name || 'Unknown',
          clientEmail: client?.email || '',
          fileCount: files.length,
          credits: task.creditsUsed,
        })

        // Notify client that deliverables have been submitted
        if (client?.email) {
          const { sendEmail, emailTemplates } = await import('@/lib/notifications/email')
          const emailData = emailTemplates.deliverableSubmittedToClient(
            client.name || 'there',
            task.title,
            freelancer?.name || 'Your designer',
            `${config.app.url}/dashboard/tasks/${task.id}`
          )
          await sendEmail({ to: client.email, subject: emailData.subject, html: emailData.html })
        }
      } catch (notifyError) {
        logger.error({ error: notifyError }, 'Failed to send notifications')
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/freelancer/submit-deliverable' }
  )
}
