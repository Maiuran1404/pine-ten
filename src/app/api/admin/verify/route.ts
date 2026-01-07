import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, users, taskFiles } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET - List all tasks pending admin verification
export async function GET() {
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

    // Get all tasks pending admin review
    const pendingTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        clientId: tasks.clientId,
        freelancerId: tasks.freelancerId,
      })
      .from(tasks)
      .where(eq(tasks.status, "PENDING_ADMIN_REVIEW"))
      .orderBy(desc(tasks.updatedAt));

    // Enrich with user details and deliverable counts
    const enrichedTasks = await Promise.all(
      pendingTasks.map(async (task) => {
        // Get client
        const [client] = await db
          .select({
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, task.clientId))
          .limit(1);

        // Get freelancer
        let freelancer = null;
        if (task.freelancerId) {
          const [f] = await db
            .select({
              name: users.name,
              email: users.email,
              image: users.image,
            })
            .from(users)
            .where(eq(users.id, task.freelancerId))
            .limit(1);
          freelancer = f || null;
        }

        // Count deliverables
        const deliverableResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(taskFiles)
          .where(eq(taskFiles.taskId, task.id));

        return {
          id: task.id,
          title: task.title,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          client,
          freelancer,
          deliverableCount: Number(deliverableResult[0]?.count || 0),
        };
      })
    );

    return NextResponse.json({ tasks: enrichedTasks });
  } catch (error) {
    console.error("Fetch pending verifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending verifications" },
      { status: 500 }
    );
  }
}
