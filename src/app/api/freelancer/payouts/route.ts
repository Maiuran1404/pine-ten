import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, gte, lt, desc, sum, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Calculate date boundaries
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Define the holding period (7 days after completion for funds to become "available")
    const holdingPeriodDays = 7;
    const availableCutoff = new Date();
    availableCutoff.setDate(availableCutoff.getDate() - holdingPeriodDays);

    // Get lifetime earnings from completed tasks
    const lifetimeResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED")
        )
      );

    // Get available balance (completed tasks older than 7 days)
    const availableResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          lt(tasks.completedAt, availableCutoff)
        )
      );

    // Get pending balance (completed tasks within last 7 days + tasks in review)
    const pendingCompletedResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, availableCutoff)
        )
      );

    // Get pending from tasks in review
    const pendingReviewResult = await db
      .select({
        total: sum(tasks.creditsUsed),
        count: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          sql`${tasks.status} IN ('IN_REVIEW', 'PENDING_ADMIN_REVIEW')`
        )
      );

    // This month's earnings
    const thisMonthResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, startOfThisMonth)
        )
      );

    // Last month's earnings
    const lastMonthResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, startOfLastMonth),
          lt(tasks.completedAt, startOfThisMonth)
        )
      );

    // Get recent earnings (individual tasks)
    const recentEarnings = await db
      .select({
        id: tasks.id,
        taskId: tasks.id,
        taskTitle: tasks.title,
        credits: tasks.creditsUsed,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED")
        )
      )
      .orderBy(desc(tasks.completedAt))
      .limit(20);

    // Format earnings with status
    const earnings = recentEarnings.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      credits: entry.credits,
      completedAt: entry.completedAt?.toISOString() || new Date().toISOString(),
      status: entry.completedAt && entry.completedAt < availableCutoff
        ? "available" as const
        : "pending" as const,
    }));

    // Get monthly earnings breakdown (last 6 months)
    const monthlyEarnings = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthResult = await db
        .select({
          total: sum(tasks.creditsUsed),
          taskCount: count(),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, userId),
            eq(tasks.status, "COMPLETED"),
            gte(tasks.completedAt, monthStart),
            lt(tasks.completedAt, monthEnd)
          )
        );

      const monthName = monthStart.toLocaleString("en-US", { month: "long" });

      monthlyEarnings.push({
        month: monthName,
        year: monthStart.getFullYear(),
        credits: Number(monthResult[0]?.total) || 0,
        tasksCompleted: Number(monthResult[0]?.taskCount) || 0,
      });
    }

    // Calculate totals
    const pendingFromCompleted = Number(pendingCompletedResult[0]?.total) || 0;
    const pendingFromReview = Number(pendingReviewResult[0]?.total) || 0;
    const pendingTasksCount = Number(pendingReviewResult[0]?.count) || 0;

    const stats = {
      availableBalance: Number(availableResult[0]?.total) || 0,
      pendingBalance: pendingFromCompleted + pendingFromReview,
      lifetimeEarnings: Number(lifetimeResult[0]?.total) || 0,
      thisMonthEarnings: Number(thisMonthResult[0]?.total) || 0,
      lastMonthEarnings: Number(lastMonthResult[0]?.total) || 0,
      pendingTasksCount: pendingTasksCount,
    };

    // Payout history would come from a payouts table (to be implemented)
    // For now, return empty array
    const payoutHistory: never[] = [];

    return NextResponse.json({
      stats,
      earnings,
      monthlyEarnings,
      payoutHistory,
    });
  } catch (error) {
    console.error("Payout data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout data" },
      { status: 500 }
    );
  }
}
