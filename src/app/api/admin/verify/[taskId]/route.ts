import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { tasks, users, taskFiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { adminNotifications } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

// GET - Fetch task details for verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { taskId } = await params

      // Fetch task with related data
      const [task] = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          createdAt: tasks.createdAt,
          clientId: tasks.clientId,
          freelancerId: tasks.freelancerId,
        })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1)

      if (!task) {
        throw Errors.notFound('Task')
      }

      // Get client info
      const [client] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, task.clientId))
        .limit(1)

      // Get freelancer info if assigned
      let freelancer = null
      if (task.freelancerId) {
        const [f] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, task.freelancerId))
          .limit(1)
        freelancer = f || null
      }

      // Get deliverable files
      const deliverables = await db.select().from(taskFiles).where(eq(taskFiles.taskId, taskId))

      return successResponse({
        task: {
          ...task,
          client,
          freelancer,
          deliverables: deliverables.filter((f) => f.isDeliverable),
          attachments: deliverables.filter((f) => !f.isDeliverable),
        },
      })
    },
    { endpoint: 'GET /api/admin/verify/[taskId]' }
  )
}

// POST - Approve or reject deliverable (approve sends to client, reject sends back to artist)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { taskId } = await params
      const body = await request.json()
      const { action, feedback } = body

      if (!action || !['approve', 'reject'].includes(action)) {
        throw Errors.badRequest("Invalid action. Must be 'approve' or 'reject'")
      }

      // Fetch the task
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)

      if (!task) {
        throw Errors.notFound('Task')
      }

      const verifiableStatuses = ['PENDING_ADMIN_REVIEW', 'IN_REVIEW', 'REVISION_REQUESTED']
      if (!verifiableStatuses.includes(task.status)) {
        throw Errors.badRequest(`Cannot verify task with status: ${task.status}`)
      }

      // Get client and freelancer info for notifications
      const [client] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, task.clientId))
        .limit(1)

      let freelancer = null
      if (task.freelancerId) {
        const [f] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, task.freelancerId))
          .limit(1)
        freelancer = f
      }

      if (action === 'approve') {
        // Update task status to IN_REVIEW (client can now see deliverables)
        await db
          .update(tasks)
          .set({
            status: 'IN_REVIEW',
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))

        // Notify client that deliverables are ready for review
        if (client?.email) {
          try {
            await adminNotifications.deliverableVerified({
              taskTitle: task.title,
              clientName: client.name || 'Client',
              clientEmail: client.email,
              freelancerName: freelancer?.name || 'Your designer',
              taskUrl: `${config.app.url}/dashboard/tasks/${taskId}`,
            })
          } catch (notifyError) {
            logger.error({ error: notifyError }, 'Failed to send client notification')
          }
        }

        return successResponse({
          message: 'Deliverable approved and client notified',
        })
      } else {
        // Reject - send back to freelancer for revision
        await db
          .update(tasks)
          .set({
            status: 'REVISION_REQUESTED',
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))

        // Notify freelancer about the rejection
        if (freelancer?.email) {
          try {
            const { emailTemplates, sendEmail } = await import('@/lib/notifications/email')
            const emailData = emailTemplates.revisionRequested(
              freelancer.name || 'Designer',
              task.title,
              `${config.app.url}/portal/tasks/${taskId}`,
              feedback || 'Admin review: Please revise the deliverables and resubmit.'
            )
            await sendEmail({
              to: freelancer.email,
              subject: emailData.subject,
              html: emailData.html,
            })
          } catch (notifyError) {
            logger.error({ error: notifyError }, 'Failed to send freelancer notification')
          }
        }

        return successResponse({
          message: 'Deliverable rejected and freelancer notified',
        })
      }
    },
    { endpoint: 'POST /api/admin/verify/[taskId]' }
  )
}
