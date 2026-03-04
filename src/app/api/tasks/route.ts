import { NextRequest, NextResponse } from 'next/server'
import { db, withTransaction } from '@/db'
import {
  tasks,
  users,
  taskCategories,
  taskFiles,
  creditTransactions,
  taskActivityLog,
  briefs,
  taskOffers,
  freelancerProfiles,
} from '@/db/schema'
import { eq, ne, desc, and, sql, count, inArray, like } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  notify,
  adminNotifications,
  notifyAdminWhatsApp,
  adminWhatsAppTemplates,
} from '@/lib/notifications'
import { sendNotificationEmail } from '@/lib/notifications/safe-send'
import { config } from '@/lib/config'
import { createTaskSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth, requireRole } from '@/lib/require-auth'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { captureServerEvent } from '@/lib/posthog'
import { PostHogEvents } from '@/lib/posthog-events'
import {
  rankArtistsForTask,
  detectTaskComplexity,
  detectTaskUrgency,
  type TaskData,
  type ArtistScore,
} from '@/lib/assignment-algorithm'
import { calculateDeliveryDays, calculateDeadlineFromNow } from '@/lib/deadline'

export async function GET(request: NextRequest) {
  // Check rate limit (100 req/min)
  const { limited, resetIn } = await checkRateLimit(request, 'api', config.rateLimits.api)
  if (limited) {
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter: resetIn },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(resetIn))
    return response
  }

  return withErrorHandling(
    async () => {
      const session = await requireAuth()

      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')
      const status = searchParams.get('status')
      const view = searchParams.get('view') // 'client' or 'freelancer' to force a specific view
      const includeDeliverables = searchParams.get('includeDeliverables') === 'true'

      // Build conditions based on user role or explicit view parameter
      const user = session.user as { role?: string }
      let conditions

      // SECURITY: Only allow view override for ADMIN users
      // Non-admin users always see data for their own role
      const derivedView =
        user.role === 'ADMIN' ? 'admin' : user.role === 'FREELANCER' ? 'freelancer' : 'client'
      const effectiveView = user.role === 'ADMIN' && view ? view : derivedView

      if (effectiveView === 'admin' && user.role === 'ADMIN') {
        // Admin sees all tasks
        conditions = status
          ? eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
          : undefined
      } else if (effectiveView === 'freelancer') {
        // Freelancer view - sees assigned tasks
        conditions = status
          ? and(
              eq(tasks.freelancerId, session.user.id),
              eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
            )
          : eq(tasks.freelancerId, session.user.id)
      } else {
        // Client view (default) - sees their own created tasks
        conditions = status
          ? and(
              eq(tasks.clientId, session.user.id),
              eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
            )
          : eq(tasks.clientId, session.user.id)
      }

      // Lightweight projection for list views — excludes heavy JSONB columns
      // (structureData, chatHistory, briefData, deliverables)
      const clients = alias(users, 'clients')

      const taskListSelect = {
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        clientId: tasks.clientId,
        freelancerId: tasks.freelancerId,
        categoryId: tasks.categoryId,
        creditsUsed: tasks.creditsUsed,
        estimatedHours: tasks.estimatedHours,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        priority: tasks.priority,
        urgency: tasks.urgency,
        requirements: tasks.requirements,
        assignedAt: tasks.assignedAt,
        completedAt: tasks.completedAt,
        moodboardItems: tasks.moodboardItems,
        styleReferences: tasks.styleReferences,
        freelancerName: users.name,
        freelancerImage: users.image,
        clientName: clients.name,
        categoryName: taskCategories.name,
      }

      const taskListRaw = await db
        .select(taskListSelect)
        .from(tasks)
        .leftJoin(users, eq(tasks.freelancerId, users.id))
        .leftJoin(clients, eq(tasks.clientId, clients.id))
        .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
        .where(conditions)
        .orderBy(desc(tasks.createdAt))
        .limit(limit)
        .offset(offset)

      // Fetch first image attachment per task as fallback thumbnail
      const taskIds = taskListRaw.map((t) => t.id)
      const imageAttachments =
        taskIds.length > 0
          ? await db
              .select({
                taskId: taskFiles.taskId,
                fileUrl: taskFiles.fileUrl,
                fileName: taskFiles.fileName,
              })
              .from(taskFiles)
              .where(
                and(
                  inArray(taskFiles.taskId, taskIds),
                  like(taskFiles.fileType, 'image/%'),
                  eq(taskFiles.isDeliverable, false)
                )
              )
          : []

      // Group by taskId — keep first image per task
      const thumbnailByTaskId = new Map<string, string>()
      for (const img of imageAttachments) {
        if (!thumbnailByTaskId.has(img.taskId)) {
          thumbnailByTaskId.set(img.taskId, img.fileUrl)
        }
      }

      // Batch-fetch deliverable files when requested (fixes N+1 in designs library)
      type DeliverableFile = {
        id: string
        taskId: string
        fileName: string
        fileUrl: string
        fileType: string
        fileSize: number
        isDeliverable: boolean
        createdAt: Date
      }
      const deliverablesByTaskId = new Map<string, DeliverableFile[]>()
      if (includeDeliverables && taskIds.length > 0) {
        const deliverableFiles = await db
          .select({
            id: taskFiles.id,
            taskId: taskFiles.taskId,
            fileName: taskFiles.fileName,
            fileUrl: taskFiles.fileUrl,
            fileType: taskFiles.fileType,
            fileSize: taskFiles.fileSize,
            isDeliverable: taskFiles.isDeliverable,
            createdAt: taskFiles.createdAt,
          })
          .from(taskFiles)
          .where(and(inArray(taskFiles.taskId, taskIds), eq(taskFiles.isDeliverable, true)))

        for (const file of deliverableFiles) {
          const existing = deliverablesByTaskId.get(file.taskId)
          if (existing) {
            existing.push(file)
          } else {
            deliverablesByTaskId.set(file.taskId, [file])
          }
        }
      }

      // Transform to include nested freelancer object
      const taskList = taskListRaw.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        clientId: task.clientId,
        categoryId: task.categoryId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        creditsUsed: task.creditsUsed,
        estimatedHours: task.estimatedHours,
        deadline: task.deadline,
        priority: task.priority,
        requirements: task.requirements,
        assignedAt: task.assignedAt,
        completedAt: task.completedAt,
        moodboardItems: task.moodboardItems || [],
        styleReferences: task.styleReferences || [],
        thumbnailUrl: thumbnailByTaskId.get(task.id) || null,
        freelancer: task.freelancerId
          ? {
              id: task.freelancerId,
              name: task.freelancerName,
              image: task.freelancerImage,
            }
          : null,
        ...(includeDeliverables ? { files: deliverablesByTaskId.get(task.id) || [] } : {}),
      }))

      // Get stats — 3 targeted queries with proper WHERE to hit indexes
      const [activeResult, completedResult, creditsResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.clientId, session.user.id),
              ne(tasks.status, 'COMPLETED'),
              ne(tasks.status, 'CANCELLED')
            )
          ),
        db
          .select({ count: count() })
          .from(tasks)
          .where(and(eq(tasks.clientId, session.user.id), eq(tasks.status, 'COMPLETED'))),
        db
          .select({ total: sql<number>`COALESCE(SUM(${tasks.creditsUsed}), 0)` })
          .from(tasks)
          .where(eq(tasks.clientId, session.user.id)),
      ])

      return successResponse({
        tasks: taskList,
        stats: {
          activeTasks: Number(activeResult[0]?.count) || 0,
          completedTasks: Number(completedResult[0]?.count) || 0,
          totalCreditsUsed: Number(creditsResult[0]?.total) || 0,
        },
      })
    },
    { endpoint: 'GET /api/tasks' }
  )
}

export async function POST(request: NextRequest) {
  // Check rate limit (100 req/min)
  const { limited, resetIn } = await checkRateLimit(request, 'api', config.rateLimits.api)
  if (limited) {
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter: resetIn },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(resetIn))
    return response
  }

  return withErrorHandling(
    async () => {
      // SECURITY: Only CLIENT and ADMIN can create tasks
      const session = await requireRole('CLIENT', 'ADMIN')

      // Parse and validate request body
      const body = await request.json()
      const validatedData = createTaskSchema.parse(body)

      const {
        title,
        description,
        category,
        requirements,
        estimatedHours,
        creditsRequired,
        deadline,
        chatHistory,
        styleReferences,
        attachments,
        moodboardItems,
        structureData,
        briefId,
      } = validatedData

      // Idempotency: if a task already exists for this briefId, return it
      // SECURITY: Verify brief belongs to the requesting user
      if (briefId) {
        const existingBrief = await db.query.briefs.findFirst({
          where: and(
            eq(briefs.id, briefId),
            eq(briefs.userId, session.user.id),
            sql`${briefs.taskId} IS NOT NULL`
          ),
          columns: { taskId: true },
        })
        if (existingBrief?.taskId) {
          return successResponse(
            { taskId: existingBrief.taskId, status: 'ALREADY_EXISTS', duplicate: true },
            200
          )
        }
      }

      // Use transaction to prevent race conditions
      const result = await withTransaction(async (tx) => {
        // Get user's current credits and companyId with row lock
        const [userResult] = await tx
          .select({ credits: users.credits, companyId: users.companyId })
          .from(users)
          .where(eq(users.id, session.user.id))
          .for('update') // Lock the row

        if (!userResult) {
          throw Errors.notFound('User')
        }

        const currentCredits = userResult.credits
        const userCompanyId = userResult.companyId

        // SECURITY: Server-side credit calculation — never trust client-supplied amount
        let serverCreditsRequired = creditsRequired

        // Find category ID and slug
        let categoryId = null
        let categorySlug = null
        if (category) {
          categorySlug = category.toLowerCase().replace(/_/g, '-')
          const [categoryResult] = await tx
            .select({ id: taskCategories.id, baseCredits: taskCategories.baseCredits })
            .from(taskCategories)
            .where(eq(taskCategories.slug, categorySlug))
            .limit(1)

          if (categoryResult) {
            categoryId = categoryResult.id
            // Use server-side base credits from DB if available
            if (categoryResult.baseCredits) {
              serverCreditsRequired = categoryResult.baseCredits
            }
          }
        }

        // Validate client amount is reasonable (within 50% tolerance of server value)
        // This allows some flexibility for urgency/quantity adjustments while blocking
        // blatant manipulation (e.g., sending 1 for a 40-credit task)
        const tolerance = Math.max(5, Math.ceil(serverCreditsRequired * 0.5))
        if (creditsRequired < serverCreditsRequired - tolerance) {
          throw Errors.badRequest(
            `Credit amount too low. Minimum for this task type: ${serverCreditsRequired - tolerance}`
          )
        }

        // Use the higher of client-declared or server-calculated amount
        const creditsToDeduct = Math.max(creditsRequired, serverCreditsRequired)

        if (currentCredits < creditsToDeduct) {
          throw Errors.insufficientCredits(creditsToDeduct, currentCredits)
        }

        // Auto-detect complexity and urgency
        const taskDeadline = deadline ? new Date(deadline) : null
        const reqSkills = requirements?.skills
        const requiredSkills: string[] = Array.isArray(reqSkills) ? reqSkills : []
        const taskComplexity = detectTaskComplexity(
          estimatedHours || null,
          requiredSkills.length,
          description
        )
        const taskUrgency = detectTaskUrgency(taskDeadline)

        // Auto-calculate deadline if not provided by client
        let computedDeadline = taskDeadline
        if (!computedDeadline && categorySlug) {
          const businessDays = calculateDeliveryDays(categorySlug, taskComplexity, taskUrgency, 1)
          computedDeadline = calculateDeadlineFromNow(businessDays)
        }

        // Create the task first (without assignment)
        const [newTask] = await tx
          .insert(tasks)
          .values({
            clientId: session.user.id,
            categoryId,
            title,
            description,
            requirements,
            estimatedHours: estimatedHours?.toString(),
            creditsUsed: creditsToDeduct,
            maxRevisions: config.tasks.defaultMaxRevisions,
            chatHistory: chatHistory || [],
            styleReferences: styleReferences || [],
            moodboardItems: moodboardItems || [],
            structureData: structureData ?? undefined,
            deadline: computedDeadline,
            status: 'PENDING',
            complexity: taskComplexity,
            urgency: taskUrgency,
            requiredSkills,
          })
          .returning()

        // Prepare task data for ranking
        const taskData: TaskData = {
          id: newTask.id,
          title,
          complexity: taskComplexity,
          urgency: taskUrgency,
          categorySlug,
          requiredSkills,
          clientId: session.user.id,
          deadline: taskDeadline,
        }

        // Rank artists to find the best match
        const rankedArtists = await rankArtistsForTask(taskData, 1)

        let bestArtist: ArtistScore | null = null
        let isFallbackAssignment = false

        if (rankedArtists.length > 0) {
          bestArtist = rankedArtists[0]
        } else {
          // Fallback: Get an approved freelancer (exclude client, non-vacation, by rating)
          const [fallbackArtist] = await tx
            .select({
              userId: freelancerProfiles.userId,
              name: users.name,
              email: users.email,
              timezone: freelancerProfiles.timezone,
              experienceLevel: freelancerProfiles.experienceLevel,
              rating: freelancerProfiles.rating,
              completedTasks: freelancerProfiles.completedTasks,
              acceptanceRate: freelancerProfiles.acceptanceRate,
              onTimeRate: freelancerProfiles.onTimeRate,
              maxConcurrentTasks: freelancerProfiles.maxConcurrentTasks,
              workingHoursStart: freelancerProfiles.workingHoursStart,
              workingHoursEnd: freelancerProfiles.workingHoursEnd,
              acceptsUrgentTasks: freelancerProfiles.acceptsUrgentTasks,
              vacationMode: freelancerProfiles.vacationMode,
              skills: freelancerProfiles.skills,
              specializations: freelancerProfiles.specializations,
              preferredCategories: freelancerProfiles.preferredCategories,
            })
            .from(freelancerProfiles)
            .innerJoin(users, eq(freelancerProfiles.userId, users.id))
            .where(
              and(
                eq(freelancerProfiles.status, 'APPROVED'),
                ne(freelancerProfiles.userId, session.user.id),
                eq(users.role, 'FREELANCER'),
                eq(freelancerProfiles.vacationMode, false)
              )
            )
            .orderBy(desc(freelancerProfiles.rating))
            .limit(1)

          if (fallbackArtist) {
            isFallbackAssignment = true
            bestArtist = {
              artist: {
                userId: fallbackArtist.userId,
                name: fallbackArtist.name,
                email: fallbackArtist.email,
                timezone: fallbackArtist.timezone,
                experienceLevel: (fallbackArtist.experienceLevel || 'JUNIOR') as
                  | 'JUNIOR'
                  | 'MID'
                  | 'SENIOR'
                  | 'EXPERT',
                rating: Number(fallbackArtist.rating) || 0,
                completedTasks: fallbackArtist.completedTasks,
                acceptanceRate: fallbackArtist.acceptanceRate
                  ? Number(fallbackArtist.acceptanceRate)
                  : null,
                onTimeRate: fallbackArtist.onTimeRate ? Number(fallbackArtist.onTimeRate) : null,
                maxConcurrentTasks: fallbackArtist.maxConcurrentTasks,
                workingHoursStart: fallbackArtist.workingHoursStart || '09:00',
                workingHoursEnd: fallbackArtist.workingHoursEnd || '18:00',
                acceptsUrgentTasks: fallbackArtist.acceptsUrgentTasks,
                vacationMode: fallbackArtist.vacationMode,
                skills: (fallbackArtist.skills as string[]) || [],
                specializations: (fallbackArtist.specializations as string[]) || [],
                preferredCategories: (fallbackArtist.preferredCategories as string[]) || [],
              },
              totalScore: 0, // No score for fallback
              breakdown: {
                skillScore: 0,
                timezoneScore: 0,
                experienceScore: 0,
                workloadScore: 0,
                performanceScore: 0,
              },
              excluded: false,
            }
          }
        }

        // Always assign if we found any artist
        if (bestArtist) {
          await tx
            .update(tasks)
            .set({
              status: 'ASSIGNED',
              freelancerId: bestArtist.artist.userId,
              assignedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, newTask.id))

          // Create offer record for tracking purposes (auto-accepted)
          await tx.insert(taskOffers).values({
            taskId: newTask.id,
            artistId: bestArtist.artist.userId,
            matchScore: bestArtist.totalScore.toString(),
            escalationLevel: 1,
            expiresAt: new Date(), // Already assigned
            response: 'ACCEPTED',
            respondedAt: new Date(),
            scoreBreakdown: bestArtist.breakdown,
          })
        }

        // Log task creation activity
        await tx.insert(taskActivityLog).values({
          taskId: newTask.id,
          actorId: session.user.id,
          actorType: 'client',
          action: 'created',
          newStatus: bestArtist ? 'ASSIGNED' : 'PENDING',
          metadata: {
            creditsUsed: creditsToDeduct,
            category: category || undefined,
            complexity: taskComplexity,
            urgency: taskUrgency,
          },
        })

        // Log assignment if made
        if (bestArtist) {
          await tx.insert(taskActivityLog).values({
            taskId: newTask.id,
            actorId: null,
            actorType: 'system',
            action: 'assigned',
            previousStatus: 'PENDING',
            newStatus: 'ASSIGNED',
            metadata: {
              freelancerName: bestArtist.artist.name,
              matchScore: bestArtist.totalScore,
              isFallback: isFallbackAssignment,
            },
          })
        }

        // Deduct credits atomically
        await tx
          .update(users)
          .set({
            credits: sql`${users.credits} - ${creditsToDeduct}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, session.user.id))

        // Log credit transaction
        await tx.insert(creditTransactions).values({
          userId: session.user.id,
          amount: -creditsToDeduct,
          type: 'USAGE',
          description: `Task created: ${title}`,
          relatedTaskId: newTask.id,
        })

        // Save attachments if provided
        if (attachments && attachments.length > 0) {
          await tx.insert(taskFiles).values(
            attachments.map((file) => ({
              taskId: newTask.id,
              uploadedBy: session.user.id,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileType: file.fileType,
              fileSize: file.fileSize,
              isDeliverable: false,
            }))
          )
        }

        // Link brief to task if briefId provided
        if (briefId) {
          await tx
            .update(briefs)
            .set({
              taskId: newTask.id,
              status: 'SUBMITTED',
              updatedAt: new Date(),
            })
            .where(and(eq(briefs.id, briefId), eq(briefs.userId, session.user.id)))
        }

        return {
          task: newTask,
          assignedTo: bestArtist,
          companyId: userCompanyId,
        }
      })

      // Fire-and-forget: send all notifications in the background
      // so the API response returns immediately after the DB transaction
      const notificationPromises: Promise<unknown>[] = []

      // Admin email notification
      notificationPromises.push(
        adminNotifications
          .newTaskCreated({
            taskId: result.task.id,
            taskTitle: title,
            clientName: session.user.name || 'Unknown',
            clientEmail: session.user.email || '',
            category: category || 'General',
            creditsUsed: result.task.creditsUsed,
            deadline: deadline ? new Date(deadline) : undefined,
            companyId: result.companyId || undefined,
          })
          .catch((error) => {
            logger.error(
              { err: error, taskId: result.task.id },
              'Failed to send admin email notification'
            )
          })
      )

      // Admin WhatsApp notification
      notificationPromises.push(
        Promise.resolve()
          .then(() => {
            const whatsappMessage = adminWhatsAppTemplates.newTaskCreated({
              taskTitle: title,
              clientName: session.user.name || 'Unknown',
              clientEmail: session.user.email || '',
              category: category || 'General',
              creditsUsed: result.task.creditsUsed,
              taskUrl: `${config.app.url}/admin/tasks`,
            })
            return notifyAdminWhatsApp(whatsappMessage)
          })
          .catch((error) => {
            logger.error(
              { err: error, taskId: result.task.id },
              'Failed to send admin WhatsApp notification'
            )
          })
      )

      // Artist assignment + client notifications
      if (result.assignedTo) {
        notificationPromises.push(
          notify({
            userId: result.assignedTo.artist.userId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            content: `You have been assigned a new task: ${title}. Get started when you're ready!`,
            taskId: result.task.id,
            taskUrl: `${config.app.url}/portal/tasks/${result.task.id}`,
            additionalData: {
              taskTitle: title,
              matchScore: result.assignedTo.totalScore.toString(),
            },
          }).catch((error) => {
            logger.error(
              { err: error, artistId: result.assignedTo!.artist.userId },
              'Failed to send artist assignment notification'
            )
          })
        )

        const designerName = result.assignedTo.artist.name || 'A designer'
        const taskUrl = `${config.app.url}/dashboard/tasks/${result.task.id}`
        notificationPromises.push(
          sendNotificationEmail({
            userId: session.user.id,
            template: (t, user) =>
              t.taskAssignedToClient(user.name || 'there', title, designerName, taskUrl),
            context: 'client assignment email',
          }).catch((error) => {
            logger.error(
              { err: error, taskId: result.task.id },
              'Failed to send client assignment email'
            )
          })
        )
      }

      // Don't await — let notifications settle in the background
      void Promise.allSettled(notificationPromises)

      // PostHog server-side event (also fire-and-forget)
      captureServerEvent(session.user.id, PostHogEvents.TASK_CREATED, {
        task_id: result.task.id,
        category: category || null,
        credits_used: result.task.creditsUsed,
        complexity: result.task.complexity,
        urgency: result.task.urgency,
        match_score: result.assignedTo?.totalScore ?? null,
        assigned_to: result.assignedTo?.artist.userId ?? null,
        ...(result.companyId ? { $groups: { company: result.companyId } } : {}),
      })

      logger.info(
        {
          taskId: result.task.id,
          userId: session.user.id,
          creditsUsed: result.task.creditsUsed,
          assignedTo: result.assignedTo?.artist.userId,
          matchScore: result.assignedTo?.totalScore,
        },
        'Task created successfully'
      )

      return successResponse(
        {
          taskId: result.task.id,
          status: result.assignedTo ? 'ASSIGNED' : 'PENDING',
          assignedTo: result.assignedTo?.artist.name || null,
          matchScore: result.assignedTo?.totalScore || null,
        },
        201
      )
    },
    { endpoint: 'POST /api/tasks' }
  )
}
