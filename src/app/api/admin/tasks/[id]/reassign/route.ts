import { NextRequest } from "next/server";
import { db } from "@/db";
import { tasks, users, freelancerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { notify } from "@/lib/notifications";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { z } from "zod";

const reassignSchema = z.object({
  freelancerId: z.string().uuid("Invalid freelancer ID"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { id: taskId } = await params;
    const body = await request.json();
    const { freelancerId } = reassignSchema.parse(body);

    // Get the task
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        freelancerId: tasks.freelancerId,
        clientId: tasks.clientId,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw Errors.notFound("Task");
    }

    // Check if task is in a state that can be reassigned
    const reassignableStatuses = ["PENDING", "ASSIGNED", "IN_PROGRESS", "REVISION_REQUESTED"];
    if (!reassignableStatuses.includes(task.status)) {
      throw Errors.badRequest(`Cannot reassign task with status: ${task.status}`);
    }

    // Verify the new freelancer exists and is approved
    const [freelancer] = await db
      .select({
        userId: freelancerProfiles.userId,
        status: freelancerProfiles.status,
        name: users.name,
        email: users.email,
      })
      .from(freelancerProfiles)
      .innerJoin(users, eq(freelancerProfiles.userId, users.id))
      .where(
        and(
          eq(freelancerProfiles.userId, freelancerId),
          eq(freelancerProfiles.status, "APPROVED")
        )
      );

    if (!freelancer) {
      throw Errors.badRequest("Freelancer not found or not approved");
    }

    // Don't reassign to the same freelancer
    if (task.freelancerId === freelancerId) {
      throw Errors.badRequest("Task is already assigned to this freelancer");
    }

    const previousFreelancerId = task.freelancerId;

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        freelancerId,
        status: "ASSIGNED",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    // Notify the new freelancer
    try {
      await notify({
        userId: freelancerId,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        content: `You have been assigned a task: ${task.title}`,
        taskId: task.id,
        taskUrl: `${config.app.url}/portal/tasks/${task.id}`,
        additionalData: { taskTitle: task.title },
      });
    } catch (error) {
      logger.error({ err: error, freelancerId }, "Failed to notify new freelancer");
    }

    // Notify the previous freelancer if there was one
    if (previousFreelancerId) {
      try {
        await notify({
          userId: previousFreelancerId,
          type: "NEW_MESSAGE",
          title: "Task Reassigned",
          content: `The task "${task.title}" has been reassigned to another artist.`,
          taskId: task.id,
          additionalData: { taskTitle: task.title },
        });
      } catch (error) {
        logger.error({ err: error, previousFreelancerId }, "Failed to notify previous freelancer");
      }
    }

    logger.info(
      {
        taskId,
        previousFreelancerId,
        newFreelancerId: freelancerId,
      },
      "Task reassigned"
    );

    return successResponse({
      task: updatedTask,
      assignedTo: freelancer.name,
    });
  }, { endpoint: "POST /api/admin/tasks/[id]/reassign" });
}

// GET endpoint to list available freelancers for reassignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    await requireAdmin();

    // Get all approved freelancers
    const freelancers = await db
      .select({
        userId: freelancerProfiles.userId,
        name: users.name,
        email: users.email,
        image: users.image,
        completedTasks: freelancerProfiles.completedTasks,
        rating: freelancerProfiles.rating,
        availability: freelancerProfiles.availability,
      })
      .from(freelancerProfiles)
      .innerJoin(users, eq(freelancerProfiles.userId, users.id))
      .where(eq(freelancerProfiles.status, "APPROVED"));

    return successResponse({ freelancers });
  }, { endpoint: "GET /api/admin/tasks/[id]/reassign" });
}
