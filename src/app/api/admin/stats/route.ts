import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, tasks, freelancerProfiles, creditTransactions } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
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

    // Get total clients
    const clientsResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "CLIENT"));

    // Get total freelancers
    const freelancersResult = await db
      .select({ count: count() })
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.status, "APPROVED"));

    // Get pending approvals
    const pendingResult = await db
      .select({ count: count() })
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.status, "PENDING"));

    // Get task stats
    const taskStatsResult = await db
      .select({
        activeTasks: count(
          sql`CASE WHEN ${tasks.status} NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END`
        ),
        completedTasks: count(
          sql`CASE WHEN ${tasks.status} = 'COMPLETED' THEN 1 END`
        ),
      })
      .from(tasks);

    // Get total revenue (sum of all credit purchases)
    const revenueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.type, "PURCHASE"));

    // $49 per credit
    const totalRevenue = (Number(revenueResult[0]?.total) || 0) * 49;

    return NextResponse.json({
      totalClients: Number(clientsResult[0]?.count) || 0,
      totalFreelancers: Number(freelancersResult[0]?.count) || 0,
      pendingApprovals: Number(pendingResult[0]?.count) || 0,
      activeTasks: Number(taskStatsResult[0]?.activeTasks) || 0,
      completedTasks: Number(taskStatsResult[0]?.completedTasks) || 0,
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
