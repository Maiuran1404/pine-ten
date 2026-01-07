import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskFiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { adminNotifications } from "@/lib/notifications";
import { config } from "@/lib/config";

// GET - Fetch task details for verification
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId } = await params;

    // Fetch task with related data
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        createdAt: tasks.createdAt,
        clientId: tasks.clientId,
        freelancerId: tasks.freelancerId,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get client info
    const [client] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, task.clientId))
      .limit(1);

    // Get freelancer info if assigned
    let freelancer = null;
    if (task.freelancerId) {
      const [f] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, task.freelancerId))
        .limit(1);
      freelancer = f || null;
    }

    // Get deliverable files
    const deliverables = await db
      .select()
      .from(taskFiles)
      .where(eq(taskFiles.taskId, taskId));

    return NextResponse.json({
      task: {
        ...task,
        client,
        freelancer,
        deliverables: deliverables.filter((f) => f.isDeliverable),
        attachments: deliverables.filter((f) => !f.isDeliverable),
      },
    });
  } catch (error) {
    console.error("Fetch task for verification error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// POST - Approve or reject deliverables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId } = await params;
    const body = await request.json();
    const { action, feedback } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "PENDING_ADMIN_REVIEW") {
      return NextResponse.json(
        { error: "Task is not pending admin review" },
        { status: 400 }
      );
    }

    // Get client and freelancer info for notifications
    const [client] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, task.clientId))
      .limit(1);

    let freelancer = null;
    if (task.freelancerId) {
      const [f] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, task.freelancerId))
        .limit(1);
      freelancer = f;
    }

    if (action === "approve") {
      // Update task status to IN_REVIEW (client can now see deliverables)
      await db
        .update(tasks)
        .set({
          status: "IN_REVIEW",
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      // Notify client that deliverables are ready for review
      if (client?.email) {
        try {
          await adminNotifications.deliverableVerified({
            taskTitle: task.title,
            clientName: client.name || "Client",
            clientEmail: client.email,
            freelancerName: freelancer?.name || "Your designer",
            taskUrl: `${config.app.url}/dashboard/tasks/${taskId}`,
          });
        } catch (notifyError) {
          console.error("Failed to send client notification:", notifyError);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Deliverable approved and client notified",
      });
    } else {
      // Reject - send back to freelancer for revision
      await db
        .update(tasks)
        .set({
          status: "REVISION_REQUESTED",
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));

      // Notify freelancer about the rejection
      if (freelancer?.email) {
        try {
          const { emailTemplates, sendEmail } = await import("@/lib/notifications/email");
          const emailData = emailTemplates.revisionRequested(
            freelancer.name || "Designer",
            task.title,
            `${config.app.url}/freelancer/tasks/${taskId}`,
            feedback || "Admin review: Please revise the deliverables and resubmit."
          );
          await sendEmail({
            to: freelancer.email,
            subject: emailData.subject,
            html: emailData.html,
          });
        } catch (notifyError) {
          console.error("Failed to send freelancer notification:", notifyError);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Deliverable rejected and freelancer notified",
      });
    }
  } catch (error) {
    console.error("Verify deliverable error:", error);
    return NextResponse.json(
      { error: "Failed to process verification" },
      { status: 500 }
    );
  }
}
