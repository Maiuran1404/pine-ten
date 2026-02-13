import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { db } from '@/db'
import { tasks, users, taskFiles } from '@/db/schema'
import { eq, desc, sql, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

// GET - List all tasks pending admin verification
export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const clients = alias(users, 'clients')
      const freelancers = alias(users, 'freelancers')

      // Single query: tasks + client + freelancer via joins
      const pendingTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          client: {
            name: clients.name,
            email: clients.email,
            image: clients.image,
          },
          freelancer: {
            name: freelancers.name,
            email: freelancers.email,
            image: freelancers.image,
          },
        })
        .from(tasks)
        .leftJoin(clients, eq(tasks.clientId, clients.id))
        .leftJoin(freelancers, eq(tasks.freelancerId, freelancers.id))
        .where(eq(tasks.status, 'PENDING_ADMIN_REVIEW'))
        .orderBy(desc(tasks.updatedAt))

      // Batch deliverable counts in a single query
      const taskIds = pendingTasks.map((t) => t.id)
      let deliverableCountMap: Record<string, number> = {}

      if (taskIds.length > 0) {
        const counts = await db
          .select({
            taskId: taskFiles.taskId,
            count: sql<number>`count(*)`,
          })
          .from(taskFiles)
          .where(inArray(taskFiles.taskId, taskIds))
          .groupBy(taskFiles.taskId)

        deliverableCountMap = Object.fromEntries(counts.map((c) => [c.taskId, Number(c.count)]))
      }

      // Assemble response preserving the original data shape
      const enrichedTasks = pendingTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        client: task.client,
        freelancer: task.freelancer?.name ? task.freelancer : null,
        deliverableCount: deliverableCountMap[task.id] ?? 0,
      }))

      return successResponse({ tasks: enrichedTasks })
    },
    { endpoint: 'GET /api/admin/verify' }
  )
}
