import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, taskMessages, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

// GET - Fetch messages for a task
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

    // Get the task to verify permissions
    const taskResult = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult[0];
    const user = session.user as { role?: string };

    // Check permissions
    if (
      user.role !== "ADMIN" &&
      task.clientId !== session.user.id &&
      task.freelancerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get messages
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

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error({ error }, "Messages fetch error");
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST - Send a new message
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
    const body = await request.json();
    const { content, attachments = [] } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Get the task to verify permissions
    const taskResult = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!taskResult.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult[0];
    const user = session.user as { role?: string };

    // Check permissions - only client, freelancer, or admin can message
    if (
      user.role !== "ADMIN" &&
      task.clientId !== session.user.id &&
      task.freelancerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert the message
    const [newMessage] = await db
      .insert(taskMessages)
      .values({
        taskId: id,
        senderId: session.user.id,
        content: content.trim(),
        attachments: attachments,
      })
      .returning();

    // Notify the other party
    const isClient = task.clientId === session.user.id;
    const recipientId = isClient ? task.freelancerId : task.clientId;

    if (recipientId) {
      try {
        await notify({
          userId: recipientId,
          type: "NEW_MESSAGE",
          title: "New Message",
          content: `${session.user.name || 'Someone'} sent you a message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          taskId: task.id,
          taskUrl: isClient ? `${config.app.url}/portal/tasks/${task.id}` : `${config.app.url}/dashboard/tasks/${task.id}`,
          additionalData: {
            taskTitle: task.title,
            senderName: session.user.name,
          },
        });
      } catch (error) {
        logger.error({ error }, "Failed to send message notification");
      }
    }

    // Get the full message with sender info
    const messageWithSender = await db
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
      .where(eq(taskMessages.id, newMessage.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      message: messageWithSender[0],
    });
  } catch (error) {
    logger.error({ error }, "Message send error");
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
