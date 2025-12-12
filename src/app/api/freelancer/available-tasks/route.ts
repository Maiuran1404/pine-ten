import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, taskCategories, freelancerProfiles } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is an approved freelancer
    const profile = await db
      .select()
      .from(freelancerProfiles)
      .where(eq(freelancerProfiles.userId, session.user.id))
      .limit(1);

    if (!profile.length || profile[0].status !== "APPROVED") {
      return NextResponse.json(
        { error: "Freelancer not approved" },
        { status: 403 }
      );
    }

    // Get available tasks (not assigned to anyone, status is PENDING)
    const availableTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        creditsUsed: tasks.creditsUsed,
        estimatedHours: tasks.estimatedHours,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt,
        requirements: tasks.requirements,
        category: {
          name: taskCategories.name,
        },
      })
      .from(tasks)
      .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .where(and(eq(tasks.status, "PENDING"), isNull(tasks.freelancerId)));

    return NextResponse.json({ tasks: availableTasks });
  } catch (error) {
    console.error("Available tasks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available tasks" },
      { status: 500 }
    );
  }
}
