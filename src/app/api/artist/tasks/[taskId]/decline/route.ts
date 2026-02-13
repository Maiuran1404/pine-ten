import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { withTransaction } from '@/db'
import { tasks, taskOffers, taskActivityLog, taskCategories } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { logger } from '@/lib/logger'
import {
  rankArtistsForTask,
  getPreviouslyOfferedArtists,
  getActiveConfig,
  TaskData,
} from '@/lib/assignment-algorithm'
import { notify, adminNotifications } from '@/lib/notifications'
import { config } from '@/lib/config'

type DeclineReason =
  | 'TOO_BUSY'
  | 'SKILL_MISMATCH'
  | 'DEADLINE_TOO_TIGHT'
  | 'LOW_CREDITS'
  | 'PERSONAL_CONFLICT'
  | 'OTHER'

/**
 * POST /api/artist/tasks/[taskId]/decline
 * Decline a task offer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withErrorHandling(
    async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      if (!session?.user) {
        throw Errors.unauthorized()
      }

      const { taskId } = await params
      const body = await request.json().catch(() => ({}))
      const { reason, note } = body as { reason?: DeclineReason; note?: string }

      // Verify the user is a freelancer
      const user = session.user as { role?: string }
      if (user.role !== 'FREELANCER' && user.role !== 'ADMIN') {
        throw Errors.forbidden('Only artists can decline task offers')
      }

      const algorithmConfig = await getActiveConfig()

      const result = await withTransaction(async (tx) => {
        // Get the task with its current offer
        const [task] = await tx
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            offeredTo: tasks.offeredTo,
            offerExpiresAt: tasks.offerExpiresAt,
            escalationLevel: tasks.escalationLevel,
            complexity: tasks.complexity,
            urgency: tasks.urgency,
            categoryId: tasks.categoryId,
            requiredSkills: tasks.requiredSkills,
            clientId: tasks.clientId,
            deadline: tasks.deadline,
          })
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .for('update')

        if (!task) {
          throw Errors.notFound('Task')
        }

        // Check if the task is offered to this user
        if (task.offeredTo !== session.user.id) {
          throw Errors.forbidden('This task is not offered to you')
        }

        // Check if the offer is still valid
        if (task.status !== 'OFFERED') {
          throw Errors.badRequest('This offer is no longer valid')
        }

        // Update the offer record
        await tx
          .update(taskOffers)
          .set({
            response: 'DECLINED',
            respondedAt: new Date(),
            declineReason: reason || null,
            declineNote: note || null,
          })
          .where(
            and(
              eq(taskOffers.taskId, taskId),
              eq(taskOffers.artistId, session.user.id),
              eq(taskOffers.response, 'PENDING')
            )
          )

        // Log the activity
        await tx.insert(taskActivityLog).values({
          taskId,
          actorId: session.user.id,
          actorType: 'freelancer',
          action: 'declined',
          previousStatus: 'OFFERED',
          newStatus: 'PENDING',
          metadata: {
            declineReason: reason,
            declineNote: note,
          },
        })

        // Get category slug if exists
        let categorySlug: string | null = null
        if (task.categoryId) {
          const [category] = await tx
            .select({ slug: taskCategories.slug })
            .from(taskCategories)
            .where(eq(taskCategories.id, task.categoryId))
          categorySlug = category?.slug || null
        }

        // Prepare task data for ranking
        const taskData: TaskData = {
          id: task.id,
          title: task.title,
          complexity: (task.complexity || 'INTERMEDIATE') as TaskData['complexity'],
          urgency: (task.urgency || 'STANDARD') as TaskData['urgency'],
          categorySlug,
          requiredSkills: (task.requiredSkills as string[]) || [],
          clientId: task.clientId,
          deadline: task.deadline,
        }

        // Get previously offered artists
        const previouslyOffered = await getPreviouslyOfferedArtists(taskId)

        // Determine current escalation level
        let currentEscalation = task.escalationLevel
        const maxOffersPerLevel =
          currentEscalation === 1
            ? algorithmConfig.escalationSettings.level1MaxOffers
            : algorithmConfig.escalationSettings.level2MaxOffers

        // Check if we need to escalate
        const offersAtCurrentLevel = previouslyOffered.length
        if (offersAtCurrentLevel >= maxOffersPerLevel && currentEscalation < 3) {
          currentEscalation += 1
        }

        // Find next best artist
        const rankedArtists = await rankArtistsForTask(taskData, currentEscalation)
        const availableArtists = rankedArtists.filter(
          (score) => !previouslyOffered.includes(score.artist.userId)
        )

        let nextAction: 'offered' | 'broadcast' | 'escalated_to_admin' = 'offered'
        let nextArtist = null

        if (availableArtists.length > 0) {
          // Offer to next artist
          nextArtist = availableArtists[0]

          // Update task with new offer
          const expiresAt = new Date()
          const minutes =
            algorithmConfig.acceptanceWindows[
              (task.urgency?.toLowerCase() ||
                'standard') as keyof typeof algorithmConfig.acceptanceWindows
            ]
          expiresAt.setMinutes(expiresAt.getMinutes() + minutes)

          await tx
            .update(tasks)
            .set({
              offeredTo: nextArtist.artist.userId,
              offerExpiresAt: expiresAt,
              escalationLevel: currentEscalation,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, taskId))

          // Create offer record
          await tx.insert(taskOffers).values({
            taskId,
            artistId: nextArtist.artist.userId,
            matchScore: nextArtist.totalScore.toString(),
            escalationLevel: currentEscalation,
            expiresAt,
            response: 'PENDING',
            scoreBreakdown: nextArtist.breakdown,
          })

          // Log the new offer
          await tx.insert(taskActivityLog).values({
            taskId,
            actorId: null,
            actorType: 'system',
            action: 'offered',
            previousStatus: 'PENDING',
            newStatus: 'OFFERED',
            metadata: {
              artistId: nextArtist.artist.userId,
              artistName: nextArtist.artist.name,
              matchScore: nextArtist.totalScore,
              escalationLevel: currentEscalation,
            },
          })
        } else if (currentEscalation < 3) {
          // Move to broadcast mode (Level 3)
          nextAction = 'broadcast'
          await tx
            .update(tasks)
            .set({
              status: 'PENDING',
              offeredTo: null,
              offerExpiresAt: null,
              escalationLevel: 3,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, taskId))

          await tx.insert(taskActivityLog).values({
            taskId,
            actorId: null,
            actorType: 'system',
            action: 'broadcast',
            metadata: {
              reason: 'No more artists to offer to',
              broadcastDuration: algorithmConfig.escalationSettings.level3BroadcastMinutes,
            },
          })
        } else {
          // Escalate to admin (Level 4)
          nextAction = 'escalated_to_admin'
          await tx
            .update(tasks)
            .set({
              status: 'UNASSIGNABLE',
              offeredTo: null,
              offerExpiresAt: null,
              escalationLevel: 4,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, taskId))

          await tx.insert(taskActivityLog).values({
            taskId,
            actorId: null,
            actorType: 'system',
            action: 'escalated',
            newStatus: 'UNASSIGNABLE',
            metadata: {
              reason: 'No artists available after all escalation levels',
              totalOffers: previouslyOffered.length + 1,
            },
          })
        }

        return { task, nextAction, nextArtist, currentEscalation }
      })

      // Send notifications based on next action
      if (result.nextAction === 'offered' && result.nextArtist) {
        try {
          await notify({
            userId: result.nextArtist.artist.userId,
            type: 'TASK_OFFERED',
            title: 'New Task Offer',
            content: `You have been offered a new task: ${result.task.title}`,
            taskId: result.task.id,
            taskUrl: `${config.app.url}/portal/tasks/${result.task.id}`,
            additionalData: {
              taskTitle: result.task.title,
              matchScore: String(result.nextArtist.totalScore),
              urgency: result.task.urgency ?? 'STANDARD',
            },
          })
        } catch (error) {
          logger.error({ error }, 'Failed to send offer notification')
        }
      } else if (result.nextAction === 'escalated_to_admin') {
        try {
          await adminNotifications.taskUnassignable({
            taskId: result.task.id,
            taskTitle: result.task.title,
            reason: 'All artists declined or no suitable artists available',
            escalationLevel: result.currentEscalation,
          })
        } catch (error) {
          logger.error({ error }, 'Failed to send admin escalation notification')
        }
      }

      logger.info(
        {
          taskId,
          artistId: session.user.id,
          reason,
          nextAction: result.nextAction,
          nextArtistId: result.nextArtist?.artist.userId,
        },
        'Task offer declined'
      )

      return successResponse({
        message: 'Task declined',
        nextAction: result.nextAction,
      })
    },
    { endpoint: 'POST /api/artist/tasks/[taskId]/decline' }
  )
}
