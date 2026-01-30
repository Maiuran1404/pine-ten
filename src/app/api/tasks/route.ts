import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, withTransaction } from "@/db";
import {
  tasks,
  users,
  taskCategories,
  taskFiles,
  freelancerProfiles,
  creditTransactions,
  taskActivityLog,
  briefs,
} from "@/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { notify, adminNotifications, notifyAdminWhatsApp, adminWhatsAppTemplates } from "@/lib/notifications";
import { config } from "@/lib/config";
import { createTaskSchema } from "@/lib/validations";
import {
  withErrorHandling,
  errorResponse,
  successResponse,
  ErrorCodes,
  Errors,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

// Get the next available freelancer using least-loaded assignment
async function getNextFreelancer(): Promise<{
  userId: string;
  name: string;
  email: string;
} | null> {
  // Get all active freelancers (approved and available)
  const activeFreelancers = await db
    .select({
      userId: freelancerProfiles.userId,
      name: users.name,
      email: users.email,
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(freelancerProfiles.userId, users.id))
    .where(
      and(
        eq(freelancerProfiles.status, "APPROVED"),
        eq(freelancerProfiles.availability, true)
      )
    );

  if (activeFreelancers.length === 0) {
    return null;
  }

  // Count active tasks per freelancer (tasks that are not completed or cancelled)
  const taskCounts = await db
    .select({
      freelancerId: tasks.freelancerId,
      count: count(),
    })
    .from(tasks)
    .where(
      and(
        sql`${tasks.freelancerId} IS NOT NULL`,
        sql`${tasks.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    )
    .groupBy(tasks.freelancerId);

  // Create a map of freelancer task counts
  const countMap = new Map<string, number>();
  taskCounts.forEach((tc) => {
    if (tc.freelancerId) {
      countMap.set(tc.freelancerId, Number(tc.count));
    }
  });

  // Find the freelancer with the least tasks
  let minTasks = Infinity;
  let selectedFreelancer = activeFreelancers[0];

  for (const freelancer of activeFreelancers) {
    const taskCount = countMap.get(freelancer.userId) || 0;
    if (taskCount < minTasks) {
      minTasks = taskCount;
      selectedFreelancer = freelancer;
    }
  }

  return selectedFreelancer;
}

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

    // Build conditions based on user role
    const user = session.user as { role?: string };
    let conditions;

    if (user.role === "ADMIN") {
      // Admin sees all tasks
      conditions = status
        ? eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
        : undefined;
    } else if (user.role === "FREELANCER") {
      // Freelancer sees assigned tasks
      conditions = status
        ? and(
            eq(tasks.freelancerId, session.user.id),
            eq(tasks.status, status as (typeof tasks.status.enumValues)[number])
          )
        : eq(tasks.freelancerId, session.user.id);
    } else {
      // Client sees their own tasks
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

      // Find category ID
      let categoryId = null;
      if (category) {
        const categorySlug = category.toLowerCase().replace(/_/g, "-");
        const [categoryResult] = await tx
          .select({ id: taskCategories.id })
          .from(taskCategories)
          .where(eq(taskCategories.slug, categorySlug))
          .limit(1);

        if (categoryResult) {
          categoryId = categoryResult.id;
        }
      }

      // Auto-assign to the next available freelancer
      const assignedFreelancer = await getNextFreelancer();

      // Create the task
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
          deadline: deadline ? new Date(deadline) : null,
          status: assignedFreelancer ? "ASSIGNED" : "PENDING",
          freelancerId: assignedFreelancer?.userId || null,
          assignedAt: assignedFreelancer ? new Date() : null,
        })
        .returning();

      // Log task creation activity
      await tx.insert(taskActivityLog).values({
        taskId: newTask.id,
        actorId: session.user.id,
        actorType: "client",
        action: "created",
        newStatus: assignedFreelancer ? "ASSIGNED" : "PENDING",
        metadata: {
          creditsUsed: creditsRequired,
          category: category || undefined,
        },
      });

      // Log assignment if auto-assigned
      if (assignedFreelancer) {
        await tx.insert(taskActivityLog).values({
          taskId: newTask.id,
          actorId: null,
          actorType: "system",
          action: "assigned",
          previousStatus: "PENDING",
          newStatus: "ASSIGNED",
          metadata: {
            freelancerName: assignedFreelancer.name,
            freelancerId: assignedFreelancer.userId,
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

      return { task: newTask, freelancer: assignedFreelancer, companyId: userCompanyId };
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

    // Notify assigned freelancer
    if (result.freelancer) {
      try {
        await notify({
          userId: result.freelancer.userId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          content: `You have been assigned a new task: ${title}`,
          taskId: result.task.id,
          taskUrl: `${config.app.url}/portal/tasks/${result.task.id}`,
          additionalData: { taskTitle: title },
        });
      } catch (error) {
        logger.error(
          { err: error, freelancerId: result.freelancer.userId },
          "Failed to send freelancer notification"
        );
      }
    }

    logger.info(
      {
        taskId: result.task.id,
        userId: session.user.id,
        creditsUsed: creditsRequired,
        freelancerAssigned: result.freelancer?.userId,
      },
      "Task created successfully"
    );

    return successResponse(
      {
        taskId: result.task.id,
        assignedTo: result.freelancer?.name || null,
      },
      201
    );
  }, { endpoint: "POST /api/tasks" });
}
