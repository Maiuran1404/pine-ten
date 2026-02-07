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
  freelancerProfiles,
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
        styleReferences: tasks.styleReferences,
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
      styleReferences: task.styleReferences,
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

      // Rank artists to find the best match
      const rankedArtists = await rankArtistsForTask(taskData, 1);

      let bestArtist: ArtistScore | null = null;
      let isFallbackAssignment = false;

      if (rankedArtists.length > 0) {
        bestArtist = rankedArtists[0];
      } else {
        // Fallback: Get ANY approved freelancer (ignore availability)
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
          .where(eq(freelancerProfiles.status, "APPROVED"))
          .limit(1);

        if (fallbackArtist) {
          isFallbackAssignment = true;
          bestArtist = {
            artist: {
              userId: fallbackArtist.userId,
              name: fallbackArtist.name,
              email: fallbackArtist.email,
              timezone: fallbackArtist.timezone,
              experienceLevel: (fallbackArtist.experienceLevel || "JUNIOR") as "JUNIOR" | "MID" | "SENIOR" | "EXPERT",
              rating: Number(fallbackArtist.rating) || 0,
              completedTasks: fallbackArtist.completedTasks,
              acceptanceRate: fallbackArtist.acceptanceRate ? Number(fallbackArtist.acceptanceRate) : null,
              onTimeRate: fallbackArtist.onTimeRate ? Number(fallbackArtist.onTimeRate) : null,
              maxConcurrentTasks: fallbackArtist.maxConcurrentTasks,
              workingHoursStart: fallbackArtist.workingHoursStart || "09:00",
              workingHoursEnd: fallbackArtist.workingHoursEnd || "18:00",
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
          };
        }
      }

      // Always assign if we found any artist
      if (bestArtist) {
        await tx
          .update(tasks)
          .set({
            status: "ASSIGNED",
            freelancerId: bestArtist.artist.userId,
            assignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, newTask.id));

        // Create offer record for tracking purposes (auto-accepted)
        await tx.insert(taskOffers).values({
          taskId: newTask.id,
          artistId: bestArtist.artist.userId,
          matchScore: bestArtist.totalScore.toString(),
          escalationLevel: 1,
          expiresAt: new Date(), // Already assigned
          response: "ACCEPTED",
          respondedAt: new Date(),
          scoreBreakdown: bestArtist.breakdown,
        });
      }

      // Log task creation activity
      await tx.insert(taskActivityLog).values({
        taskId: newTask.id,
        actorId: session.user.id,
        actorType: "client",
        action: "created",
        newStatus: bestArtist ? "ASSIGNED" : "PENDING",
        metadata: {
          creditsUsed: creditsRequired,
          category: category || undefined,
          complexity: taskComplexity,
          urgency: taskUrgency,
        },
      });

      // Log assignment if made
      if (bestArtist) {
        await tx.insert(taskActivityLog).values({
          taskId: newTask.id,
          actorId: null,
          actorType: "system",
          action: "assigned",
          previousStatus: "PENDING",
          newStatus: "ASSIGNED",
          metadata: {
            freelancerName: bestArtist.artist.name,
            matchScore: bestArtist.totalScore,
            isFallback: isFallbackAssignment,
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
        assignedTo: bestArtist,
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

    // Notify artist of the assignment
    if (result.assignedTo) {
      try {
        await notify({
          userId: result.assignedTo.artist.userId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          content: `You have been assigned a new task: ${title}. Get started when you're ready!`,
          taskId: result.task.id,
          taskUrl: `${config.app.url}/portal/tasks/${result.task.id}`,
          additionalData: {
            taskTitle: title,
            matchScore: result.assignedTo.totalScore.toString(),
          },
        });
      } catch (error) {
        logger.error(
          { err: error, artistId: result.assignedTo.artist.userId },
          "Failed to send artist assignment notification"
        );
      }
    }

    logger.info(
      {
        taskId: result.task.id,
        userId: session.user.id,
        creditsUsed: creditsRequired,
        assignedTo: result.assignedTo?.artist.userId,
        matchScore: result.assignedTo?.totalScore,
      },
      "Task created successfully"
    );

    return successResponse(
      {
        taskId: result.task.id,
        status: result.assignedTo ? "ASSIGNED" : "PENDING",
        assignedTo: result.assignedTo?.artist.name || null,
        matchScore: result.assignedTo?.totalScore || null,
      },
      201
    );
  }, { endpoint: "POST /api/tasks" });
}
