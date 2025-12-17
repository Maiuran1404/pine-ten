import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, tasks, freelancerProfiles, creditTransactions } from "@/db/schema";
import { eq, count, sum, and, notInArray, inArray } from "drizzle-orm";

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

    // Helper for safe queries
    const safeQuery = async <T>(name: string, query: Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query;
      } catch (err) {
        console.error(`Failed to query ${name}:`, err);
        return defaultValue;
      }
    };

    // Get total clients
    const clientsResult = await safeQuery(
      "clients",
      db.select({ count: count() }).from(users).where(eq(users.role, "CLIENT")),
      [{ count: 0 }]
    );

    // Get total approved freelancers
    const freelancersResult = await safeQuery(
      "freelancers",
      db.select({ count: count() }).from(freelancerProfiles).where(eq(freelancerProfiles.status, "APPROVED")),
      [{ count: 0 }]
    );

    // Get pending approvals
    const pendingResult = await safeQuery(
      "pending",
      db.select({ count: count() }).from(freelancerProfiles).where(eq(freelancerProfiles.status, "PENDING")),
      [{ count: 0 }]
    );

    // Get active tasks (not completed or cancelled)
    const activeTasksResult = await safeQuery(
      "activeTasks",
      db.select({ count: count() }).from(tasks).where(
        notInArray(tasks.status, ["COMPLETED", "CANCELLED"])
      ),
      [{ count: 0 }]
    );

    // Get completed tasks
    const completedTasksResult = await safeQuery(
      "completedTasks",
      db.select({ count: count() }).from(tasks).where(eq(tasks.status, "COMPLETED")),
      [{ count: 0 }]
    );

    // Get total revenue (sum of all credit purchases)
    const revenueResult = await safeQuery(
      "revenue",
      db.select({ total: sum(creditTransactions.amount) }).from(creditTransactions).where(eq(creditTransactions.type, "PURCHASE")),
      [{ total: "0" }]
    );

    // $49 per credit
    const totalRevenue = (Number(revenueResult[0]?.total) || 0) * 49;

    return NextResponse.json({
      totalClients: Number(clientsResult[0]?.count) || 0,
      totalFreelancers: Number(freelancersResult[0]?.count) || 0,
      pendingApprovals: Number(pendingResult[0]?.count) || 0,
      activeTasks: Number(activeTasksResult[0]?.count) || 0,
      completedTasks: Number(completedTasksResult[0]?.count) || 0,
      totalRevenue,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
