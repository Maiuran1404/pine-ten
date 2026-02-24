import { NextRequest } from 'next/server'
import { db, withTransaction } from '@/db'
import { websiteProjects, tasks, users, creditTransactions } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireClient } from '@/lib/require-auth'
import { approveWebsiteProjectSchema } from '@/lib/validations/website-flow-schemas'
import { calculateTimeline } from '@/lib/website/timeline-calculator'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const session = await requireClient()

      const body = await request.json()
      const validated = approveWebsiteProjectSchema.parse(body)

      // Load project and verify ownership
      const [project] = await db
        .select()
        .from(websiteProjects)
        .where(eq(websiteProjects.id, validated.projectId))
        .limit(1)

      if (!project) {
        throw Errors.notFound('Website project')
      }

      if (project.userId !== session.user.id) {
        throw Errors.forbidden('You do not have permission to approve this project')
      }

      if (project.phase !== 'APPROVAL') {
        throw Errors.badRequest('Project must be in APPROVAL phase to approve')
      }

      if (!project.skeleton?.sections?.length) {
        throw Errors.badRequest('Project skeleton must have at least one section before approval')
      }

      // Calculate timeline from skeleton sections
      const sectionCount = project.skeleton.sections.length
      const timeline = calculateTimeline(sectionCount)

      // Use a transaction for atomic credit deduction + task creation
      const result = await withTransaction(async (tx) => {
        // Get user credits with row lock
        const [userResult] = await tx
          .select({ credits: users.credits })
          .from(users)
          .where(eq(users.id, session.user.id))
          .for('update')

        if (!userResult) {
          throw Errors.notFound('User')
        }

        if (userResult.credits < timeline.creditsCost) {
          throw Errors.insufficientCredits(timeline.creditsCost, userResult.credits)
        }

        // Build task description from skeleton sections
        const sectionDescriptions = project
          .skeleton!.sections.sort((a, b) => a.order - b.order)
          .map((s) => `- **${s.title}** (${s.type}): ${s.description}`)
          .join('\n')

        const taskDescription = `Website Design Project\n\nSections:\n${sectionDescriptions}\n\nEstimated timeline: ${timeline.estimatedDays} days`

        // Determine task title
        const firstInspirationName = project.selectedInspirations?.[0]?.name ?? 'Custom'
        const taskTitle = `Website Design - ${firstInspirationName}`

        // Create the task
        const [newTask] = await tx
          .insert(tasks)
          .values({
            clientId: session.user.id,
            title: taskTitle,
            description: taskDescription,
            status: 'PENDING',
            creditsUsed: timeline.creditsCost,
          })
          .returning()

        // Deduct credits
        await tx
          .update(users)
          .set({
            credits: sql`${users.credits} - ${timeline.creditsCost}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, session.user.id))

        // Record credit transaction
        await tx.insert(creditTransactions).values({
          userId: session.user.id,
          amount: -timeline.creditsCost,
          type: 'USAGE',
          description: `Website design project: ${taskTitle}`,
          relatedTaskId: newTask.id,
        })

        // Update website project
        const [updatedProject] = await tx
          .update(websiteProjects)
          .set({
            status: 'APPROVED',
            taskId: newTask.id,
            timeline,
            approvedAt: new Date(),
            creditsUsed: timeline.creditsCost,
            updatedAt: new Date(),
          })
          .where(eq(websiteProjects.id, validated.projectId))
          .returning()

        return {
          project: updatedProject,
          task: newTask,
          timeline,
        }
      })

      logger.info(
        {
          projectId: validated.projectId,
          taskId: result.task.id,
          userId: session.user.id,
          creditsUsed: timeline.creditsCost,
        },
        'Website project approved and task created'
      )

      return successResponse(result, 201)
    },
    { endpoint: 'POST /api/website-flow/approve' }
  )
}
