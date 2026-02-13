import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { tasks, users, taskFiles, taskMessages } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')

      const clients = alias(users, 'clients')
      const freelancers = alias(users, 'freelancers')

      const taskList = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          creditsUsed: tasks.creditsUsed,
          createdAt: tasks.createdAt,
          deadline: tasks.deadline,
          assignedAt: tasks.assignedAt,
          clientName: clients.name,
          freelancerName: freelancers.name,
        })
        .from(tasks)
        .leftJoin(clients, eq(tasks.clientId, clients.id))
        .leftJoin(freelancers, eq(tasks.freelancerId, freelancers.id))
        .orderBy(desc(tasks.createdAt))
        .limit(limit)
        .offset(offset)

      return successResponse({ tasks: taskList })
    },
    { endpoint: 'GET /api/admin/tasks' }
  )
}

const deleteSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1, 'At least one task ID is required'),
})

export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { taskIds } = deleteSchema.parse(body)

      // Delete related records first (task_files, task_messages are CASCADE, but be explicit)
      await db.delete(taskFiles).where(inArray(taskFiles.taskId, taskIds))
      await db.delete(taskMessages).where(inArray(taskMessages.taskId, taskIds))

      // Delete the tasks
      const deleted = await db
        .delete(tasks)
        .where(inArray(tasks.id, taskIds))
        .returning({ id: tasks.id, title: tasks.title })

      if (deleted.length === 0) {
        throw Errors.notFound('Tasks')
      }

      logger.info(
        { taskIds: deleted.map((t) => t.id), count: deleted.length },
        'Tasks deleted by admin'
      )

      return successResponse({
        deleted: deleted.length,
        tasks: deleted,
      })
    },
    { endpoint: 'DELETE /api/admin/tasks' }
  )
}
