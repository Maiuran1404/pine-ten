import 'server-only'

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { tasks, taskCategories, freelancerProfiles } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

export async function GET(_request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      // Check if user is an approved freelancer
      const profile = await db
        .select()
        .from(freelancerProfiles)
        .where(eq(freelancerProfiles.userId, user.id))
        .limit(1)

      if (!profile.length || profile[0].status !== 'APPROVED') {
        throw Errors.forbidden('Freelancer not approved')
      }

      // Get available tasks (not assigned to anyone, status is PENDING)
      const availableTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          creditsUsed: tasks.creditsUsed,
          estimatedHours: tasks.estimatedHours,
          deadline: tasks.deadline,
          createdAt: tasks.createdAt,
          requirements: tasks.requirements,
          category: {
            name: taskCategories.name,
          },
        })
        .from(tasks)
        .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
        .where(and(eq(tasks.status, 'PENDING'), isNull(tasks.freelancerId)))

      return successResponse({ tasks: availableTasks })
    },
    { endpoint: 'GET /api/freelancer/available-tasks' }
  )
}
