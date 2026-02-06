import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskCategories, taskFiles, taskMessages, companies, taskActivityLog } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Type alias for better readability
const freelancerUsers = users;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get task with category and freelancer in a single query using LEFT JOINs (fixes N+1)
    const taskResult = await db
      .select({
        // Task fields
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        requirements: tasks.requirements,
        styleReferences: tasks.styleReferences,
        moodboardItems: tasks.moodboardItems,
        chatHistory: tasks.chatHistory,
        estimatedHours: tasks.estimatedHours,
        creditsUsed: tasks.creditsUsed,
        maxRevisions: tasks.maxRevisions,
        revisionsUsed: tasks.revisionsUsed,
        priority: tasks.priority,
        deadline: tasks.deadline,
        assignedAt: tasks.assignedAt,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        clientId: tasks.clientId,
        freelancerId: tasks.freelancerId,
        categoryId: tasks.categoryId,
        // Category fields (nullable due to LEFT JOIN)
        categoryDbId: taskCategories.id,
        categoryName: taskCategories.name,
        categorySlug: taskCategories.slug,
        // Freelancer fields (nullable due to LEFT JOIN)
        freelancerDbId: freelancerUsers.id,
        freelancerName: freelancerUsers.name,
        freelancerImage: freelancerUsers.image,
      })
      .from(tasks)
      .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .leftJoin(freelancerUsers, eq(tasks.freelancerId, freelancerUsers.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskRow = taskResult[0];

    // Check if user has permission to view this task
    const user = session.user as { role?: string };
    if (
      user.role !== "ADMIN" &&
      taskRow.clientId !== session.user.id &&
      taskRow.freelancerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, get the client info to find their company
    const clientInfo = await db
      .select({
        companyId: users.companyId,
      })
      .from(users)
      .where(eq(users.id, taskRow.clientId))
      .limit(1);

    const companyId = clientInfo[0]?.companyId;

    // Fetch files, messages, activity log, and optionally brand info in parallel
    const [files, messages, activityLog, brandResult, previousWorkResult] = await Promise.all([
      db
        .select()
        .from(taskFiles)
        .where(eq(taskFiles.taskId, id))
        .orderBy(desc(taskFiles.createdAt)),
      db
        .select({
          id: taskMessages.id,
          content: taskMessages.content,
          attachments: taskMessages.attachments,
          createdAt: taskMessages.createdAt,
          senderId: taskMessages.senderId,
          senderName: users.name,
          senderImage: users.image,
        })
        .from(taskMessages)
        .leftJoin(users, eq(taskMessages.senderId, users.id))
        .where(eq(taskMessages.taskId, id))
        .orderBy(taskMessages.createdAt),
      // Fetch activity log for timeline
      db
        .select({
          id: taskActivityLog.id,
          action: taskActivityLog.action,
          actorType: taskActivityLog.actorType,
          actorId: taskActivityLog.actorId,
          previousStatus: taskActivityLog.previousStatus,
          newStatus: taskActivityLog.newStatus,
          metadata: taskActivityLog.metadata,
          createdAt: taskActivityLog.createdAt,
        })
        .from(taskActivityLog)
        .where(eq(taskActivityLog.taskId, id))
        .orderBy(taskActivityLog.createdAt),
      // Fetch company/brand info if companyId exists
      companyId
        ? db
            .select()
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1)
        : Promise.resolve([]),
      // Fetch previous completed work for this company (tasks with deliverables)
      companyId
        ? db
            .select({
              taskId: tasks.id,
              taskTitle: tasks.title,
              taskStatus: tasks.status,
              completedAt: tasks.completedAt,
              categoryName: taskCategories.name,
            })
            .from(tasks)
            .leftJoin(users, eq(tasks.clientId, users.id))
            .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
            .where(
              and(
                eq(users.companyId, companyId),
                eq(tasks.status, "COMPLETED"),
                ne(tasks.id, id) // Exclude current task
              )
            )
            .orderBy(desc(tasks.completedAt))
            .limit(20)
        : Promise.resolve([]),
    ]);

    // Get deliverable files for previous work
    const previousTaskIds = previousWorkResult.map((t) => t.taskId);
    const previousDeliverables =
      previousTaskIds.length > 0
        ? await db
            .select({
              id: taskFiles.id,
              taskId: taskFiles.taskId,
              fileName: taskFiles.fileName,
              fileUrl: taskFiles.fileUrl,
              fileType: taskFiles.fileType,
              fileSize: taskFiles.fileSize,
              createdAt: taskFiles.createdAt,
            })
            .from(taskFiles)
            .where(
              and(
                eq(taskFiles.isDeliverable, true)
              )
            )
            .orderBy(desc(taskFiles.createdAt))
        : [];

    // Filter deliverables to only those belonging to previous tasks
    const filteredDeliverables = previousDeliverables.filter((d) =>
      previousTaskIds.includes(d.taskId)
    );

    // Group deliverables by task
    const previousWork = previousWorkResult.map((task) => ({
      ...task,
      deliverables: filteredDeliverables.filter((d) => d.taskId === task.taskId),
    }));

    // Build brand DNA object
    const brandDNA = brandResult[0]
      ? {
          name: brandResult[0].name,
          website: brandResult[0].website,
          industry: brandResult[0].industry,
          description: brandResult[0].description,
          logoUrl: brandResult[0].logoUrl,
          faviconUrl: brandResult[0].faviconUrl,
          colors: {
            primary: brandResult[0].primaryColor,
            secondary: brandResult[0].secondaryColor,
            accent: brandResult[0].accentColor,
            background: brandResult[0].backgroundColor,
            text: brandResult[0].textColor,
            additional: brandResult[0].brandColors || [],
          },
          typography: {
            primaryFont: brandResult[0].primaryFont,
            secondaryFont: brandResult[0].secondaryFont,
          },
          socialLinks: brandResult[0].socialLinks,
          brandAssets: brandResult[0].brandAssets,
          tagline: brandResult[0].tagline,
          keywords: brandResult[0].keywords,
        }
      : null;

    // Construct category object if it exists
    const category = taskRow.categoryDbId
      ? {
          id: taskRow.categoryDbId,
          name: taskRow.categoryName,
          slug: taskRow.categorySlug,
        }
      : null;

    // Construct freelancer object if it exists
    const freelancer = taskRow.freelancerDbId
      ? {
          id: taskRow.freelancerDbId,
          name: taskRow.freelancerName,
          image: taskRow.freelancerImage,
        }
      : null;

    return NextResponse.json({
      task: {
        id: taskRow.id,
        title: taskRow.title,
        description: taskRow.description,
        status: taskRow.status,
        requirements: taskRow.requirements,
        styleReferences: taskRow.styleReferences,
        moodboardItems: taskRow.moodboardItems,
        chatHistory: taskRow.chatHistory,
        estimatedHours: taskRow.estimatedHours,
        creditsUsed: taskRow.creditsUsed,
        maxRevisions: taskRow.maxRevisions,
        revisionsUsed: taskRow.revisionsUsed,
        priority: taskRow.priority,
        deadline: taskRow.deadline,
        assignedAt: taskRow.assignedAt,
        completedAt: taskRow.completedAt,
        createdAt: taskRow.createdAt,
        clientId: taskRow.clientId,
        freelancerId: taskRow.freelancerId,
        categoryId: taskRow.categoryId,
        category,
        freelancer,
        files,
        messages,
        brandDNA,
        previousWork,
        activityLog,
      },
    });
  } catch (error) {
    logger.error({ error }, "Task fetch error");
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
