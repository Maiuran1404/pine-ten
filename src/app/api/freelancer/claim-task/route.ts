import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, freelancerProfiles, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { safeNotify, adminNotifications } from '@/lib/notifications'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { claimTaskSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const body = claimTaskSchema.parse(await request.json())
      const { taskId } = body

      // Check if user is an approved freelancer
      const profile = await db
        .select()
        .from(freelancerProfiles)
        .where(eq(freelancerProfiles.userId, user.id))
        .limit(1)

      if (!profile.length || profile[0].status !== 'APPROVED') {
        throw Errors.forbidden('Freelancer not approved')
      }

      // Check if task is still available
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.status, 'PENDING'), isNull(tasks.freelancerId)))
        .limit(1)

      if (!task.length) {
        throw Errors.badRequest('Task is no longer available')
      }

      // Assign task to freelancer
      await db
        .update(tasks)
        .set({
          freelancerId: user.id,
          status: 'ASSIGNED',
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))

      // Notify the client that their task has been assigned
      const client = await db.select().from(users).where(eq(users.id, task[0].clientId)).limit(1)

      if (client.length) {
        await safeNotify({
          userId: client[0].id,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          content: `Your task "${task[0].title}" has been assigned to a freelancer.`,
          taskId: task[0].id,
          taskUrl: `${config.app.url}/dashboard/tasks/${task[0].id}`,
          additionalData: {
            taskTitle: task[0].title,
          },
        })

        // Send admin notification
        try {
          await adminNotifications.taskAssigned({
            taskId: task[0].id,
            taskTitle: task[0].title,
            freelancerName: user.name || 'Unknown',
            freelancerEmail: user.email || '',
            freelancerUserId: user.id,
            clientName: client[0].name,
            companyId: client[0].companyId || undefined,
            credits: task[0].creditsUsed,
          })
        } catch (emailError) {
          logger.error({ error: emailError }, 'Failed to send task assigned notification')
        }
      }

      return successResponse({ success: true })
    },
    { endpoint: 'POST /api/freelancer/claim-task' }
  )
}
