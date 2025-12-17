import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskCategories, taskFiles, taskMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

    // Get the task with related data
    const taskResult = await db
      .select({
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
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult[0];

    // Check if user has permission to view this task
    const user = session.user as { role?: string };
    if (
      user.role !== "ADMIN" &&
      task.clientId !== session.user.id &&
      task.freelancerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get category info if exists
    let category = null;
    if (task.categoryId) {
      const categoryResult = await db
        .select({
          id: taskCategories.id,
          name: taskCategories.name,
          slug: taskCategories.slug,
        })
        .from(taskCategories)
        .where(eq(taskCategories.id, task.categoryId))
        .limit(1);
      category = categoryResult[0] || null;
    }

    // Get freelancer info if assigned
    let freelancer = null;
    if (task.freelancerId) {
      const freelancerResult = await db
        .select({
          id: users.id,
          name: users.name,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, task.freelancerId))
        .limit(1);
      freelancer = freelancerResult[0] || null;
    }

    // Get task files
    const files = await db
      .select()
      .from(taskFiles)
      .where(eq(taskFiles.taskId, id))
      .orderBy(desc(taskFiles.createdAt));

    // Get task messages
    const messages = await db
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
      .orderBy(taskMessages.createdAt);

    return NextResponse.json({
      task: {
        ...task,
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
