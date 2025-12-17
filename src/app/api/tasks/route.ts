import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskCategories, taskFiles, freelancerProfiles } from "@/db/schema";
import { eq, desc, and, count, sql, asc } from "drizzle-orm";
import { notify, adminNotifications } from "@/lib/notifications";
import { config } from "@/lib/config";

// Get the next available freelancer using least-loaded assignment
async function getNextFreelancer(): Promise<{ userId: string; name: string; email: string } | null> {
  // Get all active freelancers (approved and available)
  const activeFreelancers = await db
    .select({
      userId: freelancerProfiles.userId,
      name: users.name,
      email: users.email,
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(freelancerProfiles.userId, users.id))
    .where(
      and(
        eq(freelancerProfiles.status, "APPROVED"),
        eq(freelancerProfiles.availability, true)
      )
    );

  if (activeFreelancers.length === 0) {
    return null;
  }

  // Count active tasks per freelancer (tasks that are not completed or cancelled)
  const taskCounts = await db
    .select({
      freelancerId: tasks.freelancerId,
      count: count(),
    })
    .from(tasks)
    .where(
      and(
        sql`${tasks.freelancerId} IS NOT NULL`,
        sql`${tasks.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    )
    .groupBy(tasks.freelancerId);

  // Create a map of freelancer task counts
  const countMap = new Map<string, number>();
  taskCounts.forEach((tc) => {
    if (tc.freelancerId) {
      countMap.set(tc.freelancerId, Number(tc.count));
    }
  });

  // Find the freelancer with the least tasks
  let minTasks = Infinity;
  let selectedFreelancer = activeFreelancers[0];

  for (const freelancer of activeFreelancers) {
    const taskCount = countMap.get(freelancer.userId) || 0;
    if (taskCount < minTasks) {
      minTasks = taskCount;
      selectedFreelancer = freelancer;
    }
  }

  return selectedFreelancer;
}

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
      attachments,
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

    // Auto-assign to the next available freelancer
    const assignedFreelancer = await getNextFreelancer();

    // Create the task with auto-assignment
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
        // Auto-assign if freelancer available, otherwise leave pending
        status: assignedFreelancer ? "ASSIGNED" : "PENDING",
        freelancerId: assignedFreelancer?.userId || null,
        assignedAt: assignedFreelancer ? new Date() : null,
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

    // Save attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      await db.insert(taskFiles).values(
        attachments.map((file: { fileName: string; fileUrl: string; fileType: string; fileSize: number }) => ({
          taskId: newTask.id,
          uploadedBy: session.user.id,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileSize: file.fileSize,
          isDeliverable: false,
        }))
      );
    }

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

    // Notify assigned freelancer
    if (assignedFreelancer) {
      try {
        await notify({
          userId: assignedFreelancer.userId,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          content: `You have been assigned a new task: ${title}`,
          taskId: newTask.id,
          taskUrl: `/portal/tasks/${newTask.id}`,
          additionalData: {
            taskTitle: title,
          },
        });
      } catch (emailError) {
        console.error("Failed to send freelancer assignment notification:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      taskId: newTask.id,
      assignedTo: assignedFreelancer?.name || null,
    });
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
