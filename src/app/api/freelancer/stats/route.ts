import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, freelancerProfiles } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get freelancer profile for rating
    const profile = await db
      .select({ rating: freelancerProfiles.rating })
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
          sql`CASE WHEN ${tasks.status} = 'IN_REVIEW' AND ${tasks.freelancerId} = ${session.user.id} THEN 1 END`
        ),
      })
      .from(tasks);

    return NextResponse.json({
      activeTasks: Number(statsResult[0]?.activeTasks) || 0,
      completedTasks: Number(statsResult[0]?.completedTasks) || 0,
      pendingReview: Number(statsResult[0]?.pendingReview) || 0,
      rating: profile.length ? Number(profile[0].rating) : null,
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
