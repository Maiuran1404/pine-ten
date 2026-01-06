import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskCategories, taskFiles, taskMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

    // Fetch files and messages in parallel (they're independent queries)
    const [files, messages] = await Promise.all([
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
    ]);

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
      },
    });
  } catch (error) {
    console.error("Task fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
