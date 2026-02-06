import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, freelancerProfiles } from "@/db/schema";
import { eq, count, sql, sum, and, gte } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get freelancer profile for rating and completed tasks count
    const profile = await db
      .select({
        rating: freelancerProfiles.rating,
        completedTasksCount: freelancerProfiles.completedTasks,
      })
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.userId, session.user.id))
      .limit(1);

    // Get task stats
    const statsResult = await db
      .select({
        activeTasks: count(
          sql`CASE WHEN ${tasks.status} IN ('ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED') AND ${tasks.freelancerId} = ${session.user.id} THEN 1 END`
        ),
        completedTasks: count(
          sql`CASE WHEN ${tasks.status} = 'COMPLETED' AND ${tasks.freelancerId} = ${session.user.id} THEN 1 END`
        ),
        pendingReview: count(
          sql`CASE WHEN ${tasks.status} IN ('IN_REVIEW', 'PENDING_ADMIN_REVIEW') AND ${tasks.freelancerId} = ${session.user.id} THEN 1 END`
        ),
      })
      .from(tasks);

    // Get earnings - total and this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const earningsResult = await db
      .select({
        totalEarnings: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, session.user.id),
          eq(tasks.status, "COMPLETED")
        )
      );

    const monthlyEarningsResult = await db
      .select({
        monthlyEarnings: sum(tasks.creditsUsed),
        monthlyTasks: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, session.user.id),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, startOfMonth)
        )
      );

    return NextResponse.json({
      activeTasks: Number(statsResult[0]?.activeTasks) || 0,
      completedTasks: Number(statsResult[0]?.completedTasks) || 0,
      pendingReview: Number(statsResult[0]?.pendingReview) || 0,
      rating: profile.length ? Number(profile[0].rating) : null,
      totalEarnings: Number(earningsResult[0]?.totalEarnings) || 0,
      monthlyEarnings: Number(monthlyEarningsResult[0]?.monthlyEarnings) || 0,
      monthlyTasks: Number(monthlyEarningsResult[0]?.monthlyTasks) || 0,
    });
  } catch (error) {
    logger.error({ error }, "Stats fetch error");
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
