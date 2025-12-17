import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, taskFiles, taskMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, files, message } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
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

    // Check task status allows submission
    const allowedStatuses = ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"];
    if (!allowedStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: "Cannot submit deliverable for this task status" },
        { status: 400 }
      );
    }

    // Save deliverable files
    await db.insert(taskFiles).values(
      files.map((file: { fileName: string; fileUrl: string; fileType: string; fileSize: number }) => ({
        taskId,
        uploadedBy: session.user.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: file.fileSize,
        isDeliverable: true,
      }))
    );

    // Add a message if provided
    if (message && message.trim()) {
      await db.insert(taskMessages).values({
        taskId,
        senderId: session.user.id,
        content: message,
        attachments: files.map((f: { fileUrl: string }) => f.fileUrl),
      });
    }

    // Update task status to IN_REVIEW
    await db
      .update(tasks)
      .set({
        status: "IN_REVIEW",
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit deliverable error:", error);
    return NextResponse.json(
      { error: "Failed to submit deliverable" },
      { status: 500 }
    );
  }
}
