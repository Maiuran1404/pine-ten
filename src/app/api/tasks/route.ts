import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskCategories } from "@/db/schema";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { notify, adminNotifications } from "@/lib/notifications";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    // Build conditions based on user role
    const user = session.user as { role?: string };
    let conditions;

    if (user.role === "ADMIN") {
      // Admin sees all tasks
      conditions = status ? eq(tasks.status, status as typeof tasks.status.enumValues[number]) : undefined;
    } else if (user.role === "FREELANCER") {
      // Freelancer sees assigned tasks
      conditions = status
        ? and(eq(tasks.freelancerId, session.user.id), eq(tasks.status, status as typeof tasks.status.enumValues[number]))
        : eq(tasks.freelancerId, session.user.id);
    } else {
      // Client sees their own tasks
      conditions = status
        ? and(eq(tasks.clientId, session.user.id), eq(tasks.status, status as typeof tasks.status.enumValues[number]))
        : eq(tasks.clientId, session.user.id);
    }

    const taskList = await db
      .select()
      .from(tasks)
      .where(conditions)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

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

    return NextResponse.json({
      tasks: taskList,
      stats: {
        activeTasks: Number(statsResult[0]?.activeTasks) || 0,
        completedTasks: Number(statsResult[0]?.completedTasks) || 0,
        totalCreditsUsed: Number(statsResult[0]?.totalCreditsUsed) || 0,
      },
    });
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    // Get user's current credits
    const userResult = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!userResult.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentCredits = userResult[0].credits;

    if (currentCredits < creditsRequired) {
      return NextResponse.json(
        { error: "Insufficient credits", message: "Please purchase more credits to create this task" },
        { status: 400 }
      );
    }

    // Find category ID
    let categoryId = null;
    if (category) {
      const categoryResult = await db
        .select({ id: taskCategories.id })
        .from(taskCategories)
        .where(eq(taskCategories.slug, category.toLowerCase().replace(/_/g, "-")))
        .limit(1);

      if (categoryResult.length) {
        categoryId = categoryResult[0].id;
      }
    }

    // Create the task
    const [newTask] = await db
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
        chatHistory,
        styleReferences: styleReferences || [],
        deadline: deadline ? new Date(deadline) : null,
        status: "PENDING",
      })
      .returning();

    // Deduct credits
    await db
      .update(users)
      .set({
        credits: currentCredits - creditsRequired,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    // Send admin notification for new task
    try {
      await adminNotifications.newTaskCreated({
        taskId: newTask.id,
        taskTitle: title,
        clientName: session.user.name || "Unknown",
        clientEmail: session.user.email || "",
        category: category || "General",
        creditsUsed: creditsRequired,
      });
    } catch (emailError) {
      console.error("Failed to send task creation notification:", emailError);
    }

    return NextResponse.json({
      success: true,
      taskId: newTask.id,
    });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
