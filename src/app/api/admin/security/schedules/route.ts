import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { testSchedules, testUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Calculate next run time based on frequency
function calculateNextRun(frequency: string, timezone: string = "UTC"): Date {
  const now = new Date();

  switch (frequency) {
    case "HOURLY":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "DAILY":
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(2, 0, 0, 0); // 2 AM
      return nextDay;
    case "WEEKLY":
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(2, 0, 0, 0);
      return nextWeek;
    case "MONTHLY":
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(2, 0, 0, 0);
      return nextMonth;
    default:
      return now; // MANUAL - no next run
  }
}

// GET - List all test schedules
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

    const schedules = await db
      .select({
        schedule: testSchedules,
        testUser: testUsers,
      })
      .from(testSchedules)
      .leftJoin(testUsers, eq(testSchedules.testUserId, testUsers.id))
      .orderBy(desc(testSchedules.createdAt));

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        ...s.schedule,
        testUser: s.testUser,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

// POST - Create a new schedule
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      description,
      frequency,
      cronExpression,
      timezone,
      testIds,
      categories,
      testUserId,
      targetEnvironment,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const nextRunAt = frequency !== "MANUAL"
      ? calculateNextRun(frequency || "DAILY", timezone || "UTC")
      : null;

    const [schedule] = await db
      .insert(testSchedules)
      .values({
        name,
        description,
        frequency: frequency || "DAILY",
        cronExpression,
        timezone: timezone || "UTC",
        testIds: testIds || [],
        categories: categories || [],
        testUserId,
        targetEnvironment: targetEnvironment || "production",
        nextRunAt,
      })
      .returning();

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}

// PUT - Update a schedule
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }

    // Recalculate next run if frequency changed
    if (updates.frequency) {
      updates.nextRunAt = updates.frequency !== "MANUAL"
        ? calculateNextRun(updates.frequency, updates.timezone || "UTC")
        : null;
    }

    const [schedule] = await db
      .update(testSchedules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(testSchedules.id, id))
      .returning();

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }

    await db.delete(testSchedules).where(eq(testSchedules.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
