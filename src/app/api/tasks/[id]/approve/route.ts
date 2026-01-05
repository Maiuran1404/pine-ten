import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { config } from "@/lib/config";

export async function POST(
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

    // Get the task
    const taskResult = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult[0];

    // Only the client who owns the task can approve it
    if (task.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Task must be in IN_REVIEW status to be approved
    if (task.status !== "IN_REVIEW") {
      return NextResponse.json(
        { error: "Task must be in review to approve" },
        { status: 400 }
      );
    }

    // Update task status to COMPLETED
    await db
      .update(tasks)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    // Notify the freelancer
    if (task.freelancerId) {
      try {
        await notify({
          userId: task.freelancerId,
          type: "TASK_COMPLETED",
          title: "Task Approved",
          content: `Your work on "${task.title}" has been approved by the client!`,
          taskId: task.id,
          taskUrl: `${config.app.url}/portal/tasks/${task.id}`,
          additionalData: {
            taskTitle: task.title,
          },
        });
      } catch (error) {
        console.error("Failed to send approval notification:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Task approved and marked as completed",
    });
  } catch (error) {
    console.error("Task approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve task" },
      { status: 500 }
    );
  }
}
