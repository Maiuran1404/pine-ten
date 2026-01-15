import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
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
  return withErrorHandling(async () => {
    await requireAdmin();

    const schedules = await db
      .select({
        schedule: testSchedules,
        testUser: testUsers,
      })
      .from(testSchedules)
      .leftJoin(testUsers, eq(testSchedules.testUserId, testUsers.id))
      .orderBy(desc(testSchedules.createdAt));

    return successResponse({
      schedules: schedules.map((s) => ({
        ...s.schedule,
        testUser: s.testUser,
      })),
    });
  }, { endpoint: "GET /api/admin/security/schedules" });
}

// POST - Create a new schedule
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

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
      throw Errors.badRequest("Name is required");
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

    return successResponse({ schedule }, 201);
  }, { endpoint: "POST /api/admin/security/schedules" });
}

// PUT - Update a schedule
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      throw Errors.badRequest("Schedule ID is required");
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
      throw Errors.notFound("Schedule");
    }

    return successResponse({ schedule });
  }, { endpoint: "PUT /api/admin/security/schedules" });
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Schedule ID is required");
    }

    await db.delete(testSchedules).where(eq(testSchedules.id, id));

    return successResponse({ success: true });
  }, { endpoint: "DELETE /api/admin/security/schedules" });
}
