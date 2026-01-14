import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  securityTestRuns,
  securityTestResults,
  securityTests,
  testUsers,
  testSchedules,
} from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

// GET - List test runs with optional filtering
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
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
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

      return NextResponse.json({
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

    return NextResponse.json({
      runs: runs.map((r) => ({
        ...r.run,
        schedule: r.schedule,
        testUser: r.testUser ? { name: r.testUser.name, email: r.testUser.email } : null,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch test runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch test runs" },
      { status: 500 }
    );
  }
}

// POST - Start a new test run
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; id?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
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
      return NextResponse.json(
        { error: "No tests to run. Create some tests first." },
        { status: 400 }
      );
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

    return NextResponse.json(
      {
        run,
        message: `Test run created with ${testsToRun.length} tests. Run ID: ${run.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create test run:", error);
    return NextResponse.json(
      { error: "Failed to create test run" },
      { status: 500 }
    );
  }
}

// PUT - Update a test run (for updating status/results)
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
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
    }

    const [run] = await db
      .update(securityTestRuns)
      .set(updates)
      .where(eq(securityTestRuns.id, id))
      .returning();

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error("Failed to update test run:", error);
    return NextResponse.json(
      { error: "Failed to update test run" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel/delete a test run
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
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
    }

    // Cancel if running, otherwise delete
    const [run] = await db
      .select()
      .from(securityTestRuns)
      .where(eq(securityTestRuns.id, id));

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status === "RUNNING") {
      // Just mark as cancelled
      await db
        .update(securityTestRuns)
        .set({ status: "CANCELLED", completedAt: new Date() })
        .where(eq(securityTestRuns.id, id));

      return NextResponse.json({ success: true, message: "Run cancelled" });
    }

    // Delete the run (results will cascade delete)
    await db.delete(securityTestRuns).where(eq(securityTestRuns.id, id));

    return NextResponse.json({ success: true, message: "Run deleted" });
  } catch (error) {
    console.error("Failed to delete test run:", error);
    return NextResponse.json(
      { error: "Failed to delete test run" },
      { status: 500 }
    );
  }
}
