import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { db } from "@/db";
import {
  securityTestRuns,
  securityTestResults,
  securityTests,
  testUsers,
  testSchedules,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List test runs with optional filtering
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If specific run ID, get full details with results
    if (runId) {
      const [run] = await db
        .select()
        .from(securityTestRuns)
        .where(eq(securityTestRuns.id, runId));

      if (!run) {
        throw Errors.notFound("Run");
      }

      // Get all results for this run
      const results = await db
        .select({
          result: securityTestResults,
          test: securityTests,
        })
        .from(securityTestResults)
        .leftJoin(securityTests, eq(securityTestResults.testId, securityTests.id))
        .where(eq(securityTestResults.runId, runId))
        .orderBy(securityTestResults.createdAt);

      return successResponse({
        run,
        results: results.map((r) => ({
          ...r.result,
          test: r.test,
        })),
      });
    }

    // List all runs
    const runs = await db
      .select({
        run: securityTestRuns,
        schedule: testSchedules,
        testUser: testUsers,
      })
      .from(securityTestRuns)
      .leftJoin(testSchedules, eq(securityTestRuns.scheduleId, testSchedules.id))
      .leftJoin(testUsers, eq(securityTestRuns.testUserId, testUsers.id))
      .orderBy(desc(securityTestRuns.createdAt))
      .limit(limit)
      .offset(offset);

    return successResponse({
      runs: runs.map((r) => ({
        ...r.run,
        schedule: r.schedule,
        testUser: r.testUser ? { name: r.testUser.name, email: r.testUser.email } : null,
      })),
    });
  }, { endpoint: "GET /api/admin/security/runs" });
}

// POST - Start a new test run
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireAdmin();

    const body = await request.json();
    const {
      targetUrl,
      environment,
      testUserId,
      scheduleId,
      testIds, // Optional: specific tests to run
      categories, // Optional: categories to run
    } = body;

    if (!targetUrl) {
      throw Errors.badRequest("Target URL is required");
    }

    // Get tests to run
    let testsToRun = await db
      .select()
      .from(securityTests)
      .where(eq(securityTests.isActive, true));

    // Filter by specific test IDs if provided
    if (testIds && testIds.length > 0) {
      testsToRun = testsToRun.filter((t) => testIds.includes(t.id));
    }

    // Filter by categories if provided
    if (categories && categories.length > 0) {
      testsToRun = testsToRun.filter((t) => categories.includes(t.category));
    }

    if (testsToRun.length === 0) {
      throw Errors.badRequest("No tests to run. Create some tests first.");
    }

    // Create the test run
    const [run] = await db
      .insert(securityTestRuns)
      .values({
        scheduleId,
        triggeredBy: user.id || "admin",
        status: "PENDING",
        targetUrl,
        environment: environment || "production",
        testUserId,
        totalTests: testsToRun.length,
        metadata: {
          browserInfo: "Playwright Chromium",
          viewport: { width: 1920, height: 1080 },
        },
      })
      .returning();

    // Create pending results for each test
    await db.insert(securityTestResults).values(
      testsToRun.map((test) => ({
        runId: run.id,
        testId: test.id,
        status: "PENDING" as const,
      }))
    );

    return successResponse(
      {
        run,
        message: `Test run created with ${testsToRun.length} tests. Run ID: ${run.id}`,
      },
      201
    );
  }, { endpoint: "POST /api/admin/security/runs" });
}

// PUT - Update a test run (for updating status/results)
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      throw Errors.badRequest("Run ID is required");
    }

    const [run] = await db
      .update(securityTestRuns)
      .set(updates)
      .where(eq(securityTestRuns.id, id))
      .returning();

    if (!run) {
      throw Errors.notFound("Run");
    }

    return successResponse({ run });
  }, { endpoint: "PUT /api/admin/security/runs" });
}

// DELETE - Cancel/delete a test run
export async function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      throw Errors.badRequest("Run ID is required");
    }

    // Cancel if running, otherwise delete
    const [run] = await db
      .select()
      .from(securityTestRuns)
      .where(eq(securityTestRuns.id, id));

    if (!run) {
      throw Errors.notFound("Run");
    }

    if (run.status === "RUNNING") {
      // Just mark as cancelled
      await db
        .update(securityTestRuns)
        .set({ status: "CANCELLED", completedAt: new Date() })
        .where(eq(securityTestRuns.id, id));

      return successResponse({ success: true, message: "Run cancelled" });
    }

    // Delete the run (results will cascade delete)
    await db.delete(securityTestRuns).where(eq(securityTestRuns.id, id));

    return successResponse({ success: true, message: "Run deleted" });
  }, { endpoint: "DELETE /api/admin/security/runs" });
}
