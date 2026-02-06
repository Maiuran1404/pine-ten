import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify the task exists and is assigned to this freelancer
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.freelancerId, session.user.id)
        )
      )
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found or not assigned to you" }, { status: 404 });
    }

    // Check task is in ASSIGNED status
    if (task.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "Task must be in ASSIGNED status to start" },
        { status: 400 }
      );
    }

    // Update task status to IN_PROGRESS
    await db
      .update(tasks)
      .set({
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // Notify the client that work has started
    try {
      const freelancer = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      await notify({
        userId: task.clientId,
        type: "TASK_ASSIGNED",
        title: "Work Started",
        content: `${freelancer[0]?.name || "Your designer"} has started working on "${task.title}".`,
        taskId: task.id,
        taskUrl: `${config.app.url}/dashboard/tasks/${task.id}`,
        additionalData: {
          taskTitle: task.title,
        },
      });
    } catch (notifyError) {
      logger.error({ error: notifyError }, "Failed to send start notification");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Start task error");
    return NextResponse.json(
      { error: "Failed to start task" },
      { status: 500 }
    );
  }
}
