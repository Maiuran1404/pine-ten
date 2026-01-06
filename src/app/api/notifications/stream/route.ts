import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, taskMessages } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events endpoint for real-time notifications
 * GET /api/notifications/stream
 *
 * Sends updates when:
 * - Task status changes
 * - New messages received
 * - Task assignments
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  let lastCheckTime = new Date();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Poll for updates every 5 seconds
      intervalId = setInterval(async () => {
        try {
          const notifications = await getNotifications(userId, userRole!, lastCheckTime);

          if (notifications.length > 0) {
            for (const notification of notifications) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`)
              );
            }
          }

          // Send heartbeat to keep connection alive
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`)
          );

          lastCheckTime = new Date();
        } catch (error) {
          console.error("SSE polling error:", error);
        }
      }, 5000);
    },
    cancel() {
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

interface Notification {
  type: "task_update" | "new_message" | "task_assigned" | "task_completed";
  taskId: string;
  title: string;
  message: string;
  timestamp: string;
}

async function getNotifications(
  userId: string,
  role: string,
  since: Date
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  try {
    if (role === "CLIENT") {
      // Check for task status updates for client's tasks
      const updatedTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.clientId, userId),
            gt(tasks.updatedAt, since)
          )
        )
        .orderBy(desc(tasks.updatedAt))
        .limit(10);

      for (const task of updatedTasks) {
        notifications.push({
          type: task.status === "COMPLETED" ? "task_completed" : "task_update",
          taskId: task.id,
          title: task.title,
          message: `Task "${task.title}" status updated to ${task.status}`,
          timestamp: task.updatedAt.toISOString(),
        });
      }

      // Check for new messages on client's tasks
      const newMessages = await db
        .select({
          taskId: taskMessages.taskId,
          createdAt: taskMessages.createdAt,
          content: taskMessages.content,
          taskTitle: tasks.title,
        })
        .from(taskMessages)
        .innerJoin(tasks, eq(taskMessages.taskId, tasks.id))
        .where(
          and(
            eq(tasks.clientId, userId),
            gt(taskMessages.createdAt, since)
          )
        )
        .orderBy(desc(taskMessages.createdAt))
        .limit(10);

      for (const msg of newMessages) {
        notifications.push({
          type: "new_message",
          taskId: msg.taskId,
          title: msg.taskTitle,
          message: `New message on "${msg.taskTitle}"`,
          timestamp: msg.createdAt.toISOString(),
        });
      }
    } else if (role === "FREELANCER") {
      // Check for new task assignments
      const assignedTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, userId),
            gt(tasks.updatedAt, since)
          )
        )
        .orderBy(desc(tasks.updatedAt))
        .limit(10);

      for (const task of assignedTasks) {
        notifications.push({
          type: "task_assigned",
          taskId: task.id,
          title: task.title,
          message: `Task "${task.title}" has been assigned to you`,
          timestamp: task.updatedAt.toISOString(),
        });
      }

      // Check for new messages on assigned tasks
      const newMessages = await db
        .select({
          taskId: taskMessages.taskId,
          createdAt: taskMessages.createdAt,
          content: taskMessages.content,
          taskTitle: tasks.title,
        })
        .from(taskMessages)
        .innerJoin(tasks, eq(taskMessages.taskId, tasks.id))
        .where(
          and(
            eq(tasks.freelancerId, userId),
            gt(taskMessages.createdAt, since)
          )
        )
        .orderBy(desc(taskMessages.createdAt))
        .limit(10);

      for (const msg of newMessages) {
        notifications.push({
          type: "new_message",
          taskId: msg.taskId,
          title: msg.taskTitle,
          message: `New message on "${msg.taskTitle}"`,
          timestamp: msg.createdAt.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
  }

  return notifications;
}
