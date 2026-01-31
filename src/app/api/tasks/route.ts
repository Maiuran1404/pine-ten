import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, withTransaction } from "@/db";
import {
  tasks,
  users,
  taskCategories,
  taskFiles,
  creditTransactions,
  taskActivityLog,
  briefs,
  taskOffers,
} from "@/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { notify, adminNotifications, notifyAdminWhatsApp, adminWhatsAppTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { createTaskSchema } from "@/lib/validations";
import {
  withErrorHandling,
  successResponse,
  Errors,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  rankArtistsForTask,
  getActiveConfig,
  detectTaskComplexity,
  detectTaskUrgency,
  calculateOfferExpiration,
  type TaskData,
  type ArtistScore,
} from "@/lib/assignment-algorithm";

export async function GET(request: NextRequest) {
  // Check rate limit (100 req/min)
  const { limited, resetIn } = checkRateLimit(request, "api", config.rateLimits.api);
  if (limited) {
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: resetIn },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(resetIn));
    return response;
  }

  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const view = searchParams.get("view"); // 'client' or 'freelancer' to force a specific view

    // Build conditions based on user role or explicit view parameter
    const user = session.user as { role?: string };
    let conditions;

    // Allow forcing a specific view via query parameter
    // This is useful when users access different dashboards regardless of their role
    const effectiveView = view || (user.role === "ADMIN" ? "admin" : user.role === "FREELANCER" ? "freelancer" : "client");

    if (effectiveView === "admin" && user.role === "ADMIN") {
      // Admin sees all tasks
      conditions = status
        ? eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
        : undefined;
    } else if (effectiveView === "freelancer") {
      // Freelancer view - sees assigned tasks
      conditions = status
        ? and(
            eq(tasks.freelancerId, session.user.id),
            eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
          )
        : eq(tasks.freelancerId, session.user.id);
    } else {
      // Client view (default) - sees their own created tasks
      conditions = status
        ? and(
            eq(tasks.clientId, session.user.id),
            eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
          )
        : eq(tasks.clientId, session.user.id);
    }

    const taskListRaw = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        createdAt: tasks.createdAt,
        creditsUsed: tasks.creditsUsed,
        estimatedHours: tasks.estimatedHours,
        deadline: tasks.deadline,
        assignedAt: tasks.assignedAt,
        completedAt: tasks.completedAt,
        moodboardItems: tasks.moodboardItems,
        freelancerId: tasks.freelancerId,
        freelancerName: users.name,
        freelancerImage: users.image,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.freelancerId, users.id))
      .where(conditions)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform to include nested freelancer object
    const taskList = taskListRaw.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      creditsUsed: task.creditsUsed,
      estimatedHours: task.estimatedHours,
      deadline: task.deadline,
      assignedAt: task.assignedAt,
      completedAt: task.completedAt,
      moodboardItems: task.moodboardItems,
      freelancer: task.freelancerId ? {
        id: task.freelancerId,
        name: task.freelancerName,
        image: task.freelancerImage,
      } : null,
    }));

    // Get stats
    const statsResult = await db
      .select({
        activeTasks: count(
          sql`CASE WHEN ${tasks.status} NOT IN ('COMPLETED', 'CANCELLED') AND ${tasks.clientId} = ${session.user.id} THEN 1 END`
        ),
        completedTasks: count(
          sql`CASE WHEN ${tasks.status} = 'COMPLETED' AND ${tasks.clientId} = ${session.user.id} THEN 1 END`
        ),
        totalCreditsUsed: sql<number>`COALESCE(SUM(CASE WHEN ${tasks.clientId} = ${session.user.id} THEN ${tasks.creditsUsed} ELSE 0 END), 0)`,
      })
      .from(tasks);

    return successResponse({
      tasks: taskList,
      stats: {
        activeTasks: Number(statsResult[0]?.activeTasks) || 0,
        completedTasks: Number(statsResult[0]?.completedTasks) || 0,
        totalCreditsUsed: Number(statsResult[0]?.totalCreditsUsed) || 0,
      },
    });
  }, { endpoint: "GET /api/tasks" });
}

export async function POST(request: NextRequest) {
  // Check rate limit (100 req/min)
  const { limited, resetIn } = checkRateLimit(request, "api", config.rateLimits.api);
  if (limited) {
    const response = NextResponse.json(
      { error: "Too many requests", retryAfter: resetIn },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(resetIn));
    return response;
  }

  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

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
      briefId,
      briefData,
    } = validatedData;

    // Use transaction to prevent race conditions
    const result = await withTransaction(async (tx) => {
      // Get user's current credits and companyId with row lock
      const [userResult] = await tx
        .select({ credits: users.credits, companyId: users.companyId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .for("update"); // Lock the row

      if (!userResult) {
        throw Errors.notFound("User");
      }

      const currentCredits = userResult.credits;
      const userCompanyId = userResult.companyId;

      if (currentCredits < creditsRequired) {
        throw Errors.insufficientCredits(creditsRequired, currentCredits);
      }

      // Find category ID and slug
      let categoryId = null;
      let categorySlug = null;
      if (category) {
        categorySlug = category.toLowerCase().replace(/_/g, "-");
        const [categoryResult] = await tx
          .select({ id: taskCategories.id })
          .from(taskCategories)
          .where(eq(taskCategories.slug, categorySlug))
          .limit(1);

        if (categoryResult) {
          categoryId = categoryResult.id;
        }
      }

      // Auto-detect complexity and urgency
      const taskDeadline = deadline ? new Date(deadline) : null;
      const reqSkills = requirements?.skills;
      const requiredSkills: string[] = Array.isArray(reqSkills) ? reqSkills : [];
      const taskComplexity = detectTaskComplexity(
        estimatedHours || null,
        requiredSkills.length,
        description
      );
      const taskUrgency = detectTaskUrgency(taskDeadline);

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
          creditsUsed: creditsRequired,
          maxRevisions: config.tasks.defaultMaxRevisions,
          chatHistory: chatHistory || [],
          styleReferences: styleReferences || [],
          moodboardItems: moodboardItems || [],
          deadline: taskDeadline,
          status: "PENDING",
          complexity: taskComplexity,
          urgency: taskUrgency,
          requiredSkills,
        })
        .returning();

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
      };

      // Get algorithm config and rank artists
      const algorithmConfig = await getActiveConfig();
      const rankedArtists = await rankArtistsForTask(taskData, 1);

      let bestArtist: ArtistScore | null = null;
      let offerExpiresAt: Date | null = null;

      if (rankedArtists.length > 0) {
        bestArtist = rankedArtists[0];
        offerExpiresAt = calculateOfferExpiration(taskUrgency, algorithmConfig);

        // Update task with offer info
        await tx
          .update(tasks)
          .set({
            status: "OFFERED",
            offeredTo: bestArtist.artist.userId,
            offerExpiresAt,
            escalationLevel: 1,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, newTask.id));

        // Create offer record
        await tx.insert(taskOffers).values({
          taskId: newTask.id,
          artistId: bestArtist.artist.userId,
          matchScore: bestArtist.totalScore.toString(),
          escalationLevel: 1,
          expiresAt: offerExpiresAt,
          response: "PENDING",
          scoreBreakdown: bestArtist.breakdown,
        });
      }

      // Log task creation activity
      await tx.insert(taskActivityLog).values({
        taskId: newTask.id,
        actorId: session.user.id,
        actorType: "client",
        action: "created",
        newStatus: bestArtist ? "OFFERED" : "PENDING",
        metadata: {
          creditsUsed: creditsRequired,
          category: category || undefined,
          complexity: taskComplexity,
          urgency: taskUrgency,
        },
      });

      // Log offer if made
      if (bestArtist) {
        await tx.insert(taskActivityLog).values({
          taskId: newTask.id,
          actorId: null,
          actorType: "system",
          action: "offered",
          previousStatus: "PENDING",
          newStatus: "OFFERED",
          metadata: {
            artistId: bestArtist.artist.userId,
            artistName: bestArtist.artist.name,
            matchScore: bestArtist.totalScore,
            expiresAt: offerExpiresAt?.toISOString(),
          },
        });
      }

      // Deduct credits atomically
      await tx
        .update(users)
        .set({
          credits: sql`${users.credits} - ${creditsRequired}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      // Log credit transaction
      await tx.insert(creditTransactions).values({
        userId: session.user.id,
        amount: -creditsRequired,
        type: "USAGE",
        description: `Task created: ${title}`,
        relatedTaskId: newTask.id,
      });

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
        );
      }

      // Link brief to task if briefId provided
      if (briefId) {
        await tx
          .update(briefs)
          .set({
            taskId: newTask.id,
            status: "SUBMITTED",
            updatedAt: new Date(),
          })
          .where(eq(briefs.id, briefId));
      }

      return {
        task: newTask,
        offeredTo: bestArtist,
        offerExpiresAt,
        companyId: userCompanyId
      };
    });

    // Send notifications outside the transaction (includes Slack)
    try {
      await adminNotifications.newTaskCreated({
        taskId: result.task.id,
        taskTitle: title,
        clientName: session.user.name || "Unknown",
        clientEmail: session.user.email || "",
        category: category || "General",
        creditsUsed: creditsRequired,
        deadline: deadline ? new Date(deadline) : undefined,
        companyId: result.companyId || undefined,
      });
    } catch (error) {
      logger.error({ err: error, taskId: result.task.id }, "Failed to send admin email notification");
    }

    // Send WhatsApp notification to admin
    try {
      const whatsappMessage = adminWhatsAppTemplates.newTaskCreated({
        taskTitle: title,
        clientName: session.user.name || "Unknown",
        clientEmail: session.user.email || "",
        category: category || "General",
        creditsUsed: creditsRequired,
        taskUrl: `${config.app.url}/admin/tasks`,
      });
      await notifyAdminWhatsApp(whatsappMessage);
    } catch (error) {
      logger.error({ err: error, taskId: result.task.id }, "Failed to send admin WhatsApp notification");
    }

    // Notify artist of the offer (not assignment - they need to accept)
    if (result.offeredTo) {
      try {
        await notify({
          userId: result.offeredTo.artist.userId,
          type: "TASK_OFFERED",
          title: "New Task Offer",
          content: `You have been offered a new task: ${title}. Accept within the time limit to claim it.`,
          taskId: result.task.id,
          taskUrl: `${config.app.url}/portal/tasks/${result.task.id}`,
          additionalData: {
            taskTitle: title,
            matchScore: result.offeredTo.totalScore.toString(),
          },
        });
      } catch (error) {
        logger.error(
          { err: error, artistId: result.offeredTo.artist.userId },
          "Failed to send artist offer notification"
        );
      }
    }

    logger.info(
      {
        taskId: result.task.id,
        userId: session.user.id,
        creditsUsed: creditsRequired,
        offeredTo: result.offeredTo?.artist.userId,
        matchScore: result.offeredTo?.totalScore,
      },
      "Task created successfully"
    );

    return successResponse(
      {
        taskId: result.task.id,
        status: result.offeredTo ? "OFFERED" : "PENDING",
        offeredTo: result.offeredTo?.artist.name || null,
        matchScore: result.offeredTo?.totalScore || null,
        expiresAt: result.offerExpiresAt?.toISOString() || null,
      },
      201
    );
  }, { endpoint: "POST /api/tasks" });
}
