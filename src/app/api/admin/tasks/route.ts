import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse } from "@/lib/errors";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const clients = alias(users, "clients");
    const freelancers = alias(users, "freelancers");

    const taskList = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        creditsUsed: tasks.creditsUsed,
        createdAt: tasks.createdAt,
        deadline: tasks.deadline,
        assignedAt: tasks.assignedAt,
        clientName: clients.name,
        freelancerName: freelancers.name,
      })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(freelancers, eq(tasks.freelancerId, freelancers.id))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return successResponse({ tasks: taskList });
  }, { endpoint: "GET /api/admin/tasks" });
}
