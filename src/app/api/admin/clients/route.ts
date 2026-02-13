import { db } from '@/db'
import { users, tasks, creditTransactions } from '@/db/schema'
import { eq, desc, count, sum } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      // Get all clients
      const clients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          credits: users.credits,
          onboardingCompleted: users.onboardingCompleted,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, 'CLIENT'))
        .orderBy(desc(users.createdAt))

      // Get task counts for each client - use a safer approach
      const taskCountsRaw = await db
        .select({
          clientId: tasks.clientId,
          count: count(),
        })
        .from(tasks)
        .groupBy(tasks.clientId)

      // Get completed task counts
      const completedTasksRaw = await db
        .select({
          clientId: tasks.clientId,
          count: count(),
        })
        .from(tasks)
        .where(eq(tasks.status, 'COMPLETED'))
        .groupBy(tasks.clientId)

      // Get total credits purchased for each client
      const creditsPurchasedRaw = await db
        .select({
          userId: creditTransactions.userId,
          total: sum(creditTransactions.amount),
        })
        .from(creditTransactions)
        .where(eq(creditTransactions.type, 'PURCHASE'))
        .groupBy(creditTransactions.userId)

      // Create lookup maps
      const taskCountMap = new Map(taskCountsRaw.map((tc) => [tc.clientId, tc.count]))
      const completedTaskMap = new Map(completedTasksRaw.map((tc) => [tc.clientId, tc.count]))
      const creditsMap = new Map(
        creditsPurchasedRaw.map((cp) => [cp.userId, Number(cp.total) || 0])
      )

      // Combine data
      const clientsWithStats = clients.map((client) => ({
        ...client,
        totalTasks: taskCountMap.get(client.id) || 0,
        completedTasks: completedTaskMap.get(client.id) || 0,
        totalCreditsPurchased: creditsMap.get(client.id) || 0,
      }))

      return successResponse({ clients: clientsWithStats })
    },
    { endpoint: 'GET /api/admin/clients' }
  )
}
