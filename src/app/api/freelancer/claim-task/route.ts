import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, freelancerProfiles, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { config } from "@/lib/config";

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
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if user is an approved freelancer
    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.userId, session.user.id))
      .limit(1);

    if (!profile.length || profile[0].status !== "APPROVED") {
      return NextResponse.json(
        { error: "Freelancer not approved" },
        { status: 403 }
      );
    }

    // Check if task is still available
    const task = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.status, "PENDING"),
          isNull(tasks.freelancerId)
        )
      )
      .limit(1);

    if (!task.length) {
      return NextResponse.json(
        { error: "Task is no longer available" },
        { status: 400 }
      );
    }

    // Assign task to freelancer
    await db
      .update(tasks)
      .set({
        freelancerId: session.user.id,
        status: "ASSIGNED",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // Notify the client that their task has been assigned
    const client = await db
      .select()
      .from(users)
      .where(eq(users.id, task[0].clientId))
      .limit(1);

    if (client.length) {
      await notify({
        userId: client[0].id,
        type: "TASK_ASSIGNED",
        title: "Task Assigned",
        content: `Your task "${task[0].title}" has been assigned to a freelancer.`,
        taskId: task[0].id,
        taskUrl: `${config.app.url}/dashboard/tasks/${task[0].id}`,
        additionalData: {
          taskTitle: task[0].title,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Claim task error:", error);
    return NextResponse.json(
      { error: "Failed to claim task" },
      { status: 500 }
    );
  }
}
