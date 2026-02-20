import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { users, tasks, creditTransactions, sessions } from '@/db/schema'
import { eq, count, sum, max, and, or, ilike } from 'drizzle-orm'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse } from '@/lib/errors'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const searchParams = request.nextUrl.searchParams
      const { page, pageSize, search } = querySchema.parse({
        page: searchParams.get('page') ?? undefined,
        pageSize: searchParams.get('pageSize') ?? undefined,
        search: searchParams.get('search') ?? undefined,
      })

      // Build where conditions
      const conditions = [eq(users.role, 'CLIENT')]
      if (search) {
        conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!)
      }

      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions)

      // Get total count of matching clients
      const [{ total }] = await db.select({ total: count() }).from(users).where(whereClause)

      // Get paginated clients
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
        .where(whereClause)
        .limit(pageSize)
        .offset((page - 1) * pageSize)

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

      // Get last active time from sessions
      const lastActiveRaw = await db
        .select({
          userId: sessions.userId,
          lastActiveAt: max(sessions.updatedAt),
        })
        .from(sessions)
        .groupBy(sessions.userId)

      // Create lookup maps
      const taskCountMap = new Map(taskCountsRaw.map((tc) => [tc.clientId, tc.count]))
      const completedTaskMap = new Map(completedTasksRaw.map((tc) => [tc.clientId, tc.count]))
      const creditsMap = new Map(
        creditsPurchasedRaw.map((cp) => [cp.userId, Number(cp.total) || 0])
      )
      const lastActiveMap = new Map(
        lastActiveRaw.map((la) => [la.userId, la.lastActiveAt?.toISOString() ?? null])
      )

      // Combine data
      const clientsWithStats = clients.map((client) => ({
        ...client,
        totalTasks: taskCountMap.get(client.id) || 0,
        completedTasks: completedTaskMap.get(client.id) || 0,
        totalCreditsPurchased: creditsMap.get(client.id) || 0,
        lastActiveAt: lastActiveMap.get(client.id) ?? null,
      }))

      const totalPages = Math.ceil(total / pageSize)

      return successResponse({
        clients: clientsWithStats,
        total,
        page,
        pageSize,
        totalPages,
      })
    },
    { endpoint: 'GET /api/admin/clients' }
  )
}
